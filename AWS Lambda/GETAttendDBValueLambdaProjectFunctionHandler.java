package com.amazonaws.lambda.demo;

import java.util.Iterator;

import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.ItemCollection;
import com.amazonaws.services.dynamodbv2.document.QueryOutcome;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.spec.QuerySpec;
import com.amazonaws.services.dynamodbv2.document.utils.NameMap;
import com.amazonaws.services.dynamodbv2.document.utils.ValueMap;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

/*
 * GETAttendDBValueFunction
 * SensorDB의 값을 가져올 떄 사용
 * 메서드 : /attenddb -GET-
 */

public class GETAttendDBValueLambdaProjectFunctionHandler implements RequestHandler<Event, String> {

	private DynamoDB dynamoDb;
    private String DYNAMODB_TABLE_NAME = "AttendDB";
	
    @Override
    public String handleRequest(Event input, Context context) {
    	this.initDynamoDbClient();
    	
    	Table table = dynamoDb.getTable(DYNAMODB_TABLE_NAME);
    	
    	QuerySpec querySpec = new QuerySpec()
                .withKeyConditionExpression("partitionKEY = :v_id and #t between :from and :to") 
                .withNameMap(new NameMap().with("#t", "attendTime"))
                .withValueMap(new ValueMap().withString(":v_id","PartitionKEY").withNumber(":from", input.from).withNumber(":to", input.to));
    	
    	ItemCollection<QueryOutcome> items=null;  //ItemCollection은 설정한 쿼리를 통해 반환된 값들을 가져오는 객첵임.
        try {           
            items = table.query(querySpec);
        }
        catch (Exception e) {
            System.err.println("Unable to scan the table:");
            System.err.println(e.getMessage());
        }

        return getResponse(items);
    }
    
    private String getResponse(ItemCollection<QueryOutcome> items) {

        Iterator<Item> iter = items.iterator();
        String response = "{ \"AttendDB_data\": [";
        for (int i =0; iter.hasNext(); i++) {
            if (i!=0) 
                response +=",";
            response += iter.next().toJSON();
        }
        response += "]}";
        return response;
    }
    
    private void initDynamoDbClient() {
        AmazonDynamoDB client = AmazonDynamoDBClientBuilder.standard().build();

        this.dynamoDb = new DynamoDB(client);
    }

}

class Event {
    public int from;
    public int to;
}
