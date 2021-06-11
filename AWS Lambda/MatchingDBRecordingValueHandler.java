package com.amazonaws.lambda.demo;

import java.text.SimpleDateFormat;
import java.util.Iterator;
import java.util.TimeZone;

import org.json.JSONObject;

import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.ItemCollection;
import com.amazonaws.services.dynamodbv2.document.QueryOutcome;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.spec.PutItemSpec;
import com.amazonaws.services.dynamodbv2.document.spec.QuerySpec;
import com.amazonaws.services.dynamodbv2.document.utils.NameMap;
import com.amazonaws.services.dynamodbv2.document.utils.ValueMap;
import com.amazonaws.services.dynamodbv2.model.ConditionalCheckFailedException;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

public class MatchingDBRecordingValueHandler implements RequestHandler<Document, String> {
    private DynamoDB dynamoDb;
    private String DYNAMODB_TABLE_NAME = "MatchingDB";
    
    private String response;
    private String workerId;

    @Override
    public String handleRequest(Document input, Context context) {
        this.initDynamoDbClient();

        Table table = dynamoDb.getTable(DYNAMODB_TABLE_NAME);
        
        QuerySpec querySpec = new QuerySpec()
    			.withKeyConditionExpression("partitionKEY = :v_id and #num = :v_helmetNum")
    			.withNameMap(new NameMap().with("#num", "HelmetId"))
    			.withValueMap(new ValueMap().withString(":v_id", "PartitionKEY").withString(":v_helmetNum", input.device)
    			);
        
        ItemCollection<QueryOutcome> items=null;  //ItemCollection은 설정한 쿼리를 통해 반환된 값들을 가져오는 객첵임.
        try {           
            items = table.query(querySpec);
            
            Iterator<Item> iter = items.iterator();
            response = "";
            for (int i =0; iter.hasNext(); i++) {
                if (i!=0) 
                    response +=",";
                response += iter.next().toJSON();
            }
            System.out.println(response);        
            System.out.println(workerId);            
        }
        catch (Exception e) {
            System.err.println("Unable to scan the table:");
            System.err.println(e.getMessage());
        }
        
      //json 파싱
        JSONObject jsonObj = new JSONObject(response);
        try {
        	 workerId = String.valueOf(jsonObj.get("workerId"));
        }
        catch (Exception e){
        	workerId = "None";
        }

        return persistData(input);
    }

    private String persistData(Document document) throws ConditionalCheckFailedException {

        SimpleDateFormat sdf = new SimpleDateFormat ( "yyyy-MM-dd HH:mm:ss");
        sdf.setTimeZone(TimeZone.getTimeZone("Asia/Seoul"));
        String timeString = sdf.format(new java.util.Date (document.timestamp*1000));

        // 센서 값이 이전상태와 동일한 경우 테이블에 저장하지 않고 종료
        if (document.current.state.reported.temperature.equals(document.previous.state.reported.temperature)&&
            	document.current.state.reported.humidity.equals(document.previous.state.reported.humidity)&&
            	document.current.state.reported.Mq4.equals(document.previous.state.reported.Mq4)&&
            	document.current.state.reported.Mq7.equals(document.previous.state.reported.Mq7)) {
                    return null;
            }

        return this.dynamoDb.getTable(DYNAMODB_TABLE_NAME)
                .putItem(new PutItemSpec().withItem(new Item().withPrimaryKey("partitionKEY", "PartitionKEY")
                		.withString("HelmetId", document.device)
                        .withString("temperature", document.current.state.reported.temperature)
                        .withString("humidity", document.current.state.reported.humidity)
                        .withString("Mq4", document.current.state.reported.Mq4)
                        .withString("Mq7", document.current.state.reported.Mq7)
                        .withString("workerId", workerId)
                        .withString("workSection", document.current.state.reported.workSection)
                        .withString("danger", document.current.state.reported.danger)
                        ))
                .toString();
    }

    private void initDynamoDbClient() {
        AmazonDynamoDB client = AmazonDynamoDBClientBuilder.standard().withRegion("ap-northeast-2").build();

        this.dynamoDb = new DynamoDB(client);
    }

}

class Document {
    public Thing previous;       
    public Thing current;
    public long timestamp;
    public String device;       // AWS IoT에 등록된 사물 이름 
}

class Thing {
    public State state = new State();
    public long timestamp;
    public String clientToken;

    public class State {
        public Tag reported = new Tag();
        public Tag desired = new Tag();

        public class Tag {
            public String temperature;
            public String humidity;
            public String Mq4;
            public String Mq7;
            public String workerId;
            public String workSection;
            public String danger;
        }
    }
}