package com.amazonaws.lambda.demo;

import java.text.SimpleDateFormat;
import java.util.Iterator;
import java.util.TimeZone;

import org.json.JSONObject;

import com.amazonaws.lambda.demo.Thing.State;
import com.amazonaws.lambda.demo.Thing.State.Tag;
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

public class AttendDBRecordingValueFunctionHandler implements RequestHandler<Document, String> {
	private DynamoDB dynamoDb;
    private String DYNAMODB_TABLE_NAME = "AttendDB";
    private String DYNAMODB_TABLE_NAME2 = "MatchingDB";
    private String DYNAMODB_TABLE_NAME3 = "WorkerDB";
    
    private String response;
    private String response2;
    private String workerId;  //숫자로 된 id -> WorkerDB에서 찾아야 함 -> 한글 이름
    private String workerNameK;
    
    @Override
    public String handleRequest(Document input, Context context) {
    	this.initDynamoDbClient();
    	
    	if((input.current.state.reported.workSection).equals("Enter")) {
    		
    		//MatchingDB의 workerId 값 가져와서 숫자 부분만 파싱
    		Table table = dynamoDb.getTable(DYNAMODB_TABLE_NAME2);  
    		
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
                
            }
            catch (Exception e) {
                System.err.println("Unable to scan the table:");
                System.err.println(e.getMessage());
            }
            
            //json 파싱
            JSONObject jsonObj = new JSONObject(response);
            try {
            	 workerId = String.valueOf(jsonObj.get("workerId"));
            	 workerId = workerId.split("X")[0];
            	 return searchWorkerKorName(workerId,input);
            }
            catch (Exception e){
            	workerId = "None";
            	return null;
            }
            
                        
    	}	
    	return null;   	
    }
    
    private String searchWorkerKorName(String wId, Document input) {
    	//wId는 위의 함수에서 파싱한 작업자의 id(숫자) 값
    	
    	this.initDynamoDbClient();
    	
    	//WorkerDB의 WorkerId 값 가져와서 한글만 파싱
		Table table = dynamoDb.getTable(DYNAMODB_TABLE_NAME3);  
		
		QuerySpec querySpec = new QuerySpec()
    			.withKeyConditionExpression("WorkerId = :v_id")
    			.withValueMap(new ValueMap().withString(":v_id", wId));
		
		ItemCollection<QueryOutcome> items=null;  //ItemCollection은 설정한 쿼리를 통해 반환된 값들을 가져오는 객첵임.
        try {           
            items = table.query(querySpec);
            
            Iterator<Item> iter = items.iterator();
            response2 = "";
            for (int i =0; iter.hasNext(); i++) {
                if (i!=0) 
                    response2 +=",";
                response2 += iter.next().toJSON();
            }
            System.out.println(response2);            
        }
        catch (Exception e) {
            System.err.println("Unable to scan the table:");
            System.err.println(e.getMessage());
        }
        
        //json 파싱
        JSONObject jsonObj = new JSONObject(response2);
        try {
        	workerNameK = String.valueOf(jsonObj.get("workerNameK"));
        	workerNameK = workerNameK;
        	 return persistData(input);
        }
        catch (Exception e){
        	workerNameK = "None";
        	return null;
        }
    	
    }
    
    private String persistData(Document document) throws ConditionalCheckFailedException {   	
        SimpleDateFormat sdf = new SimpleDateFormat ( "yyyy-MM-dd HH:mm:ss");
        sdf.setTimeZone(TimeZone.getTimeZone("Asia/Seoul"));
        String timeString = sdf.format(new java.util.Date (document.timestamp*1000));

        return this.dynamoDb.getTable(DYNAMODB_TABLE_NAME)
                .putItem(new PutItemSpec().withItem(new Item().withPrimaryKey("partitionKEY", "PartitionKEY")
                		.withLong("attendTime", document.timestamp)
                        .withString("workerNameK", workerNameK)
                        .withString("timestamp", timeString)
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
            public String workSection;
        }
    }
}
