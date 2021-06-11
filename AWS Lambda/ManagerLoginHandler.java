package com.amazonaws.lambda.demo;

import java.text.SimpleDateFormat;
import java.util.Iterator;
import java.util.TimeZone;

import org.apache.http.ParseException;


import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.ItemCollection;
import com.amazonaws.services.dynamodbv2.document.QueryOutcome;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.spec.GetItemSpec;
import com.amazonaws.services.dynamodbv2.document.spec.QuerySpec;
import com.amazonaws.services.dynamodbv2.document.utils.NameMap;
import com.amazonaws.services.dynamodbv2.document.utils.ValueMap;
import com.amazonaws.services.dynamodbv2.model.ConditionalCheckFailedException;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

/*
 * ManagerLoginFunction
 * 매니저가 로그인을 할 때 사용
 * ManagerDB에 저장되어 있는 id, password와 비교
 * 메서드 : /login/{id} -GET-
 */

public class ManagerLoginHandler implements RequestHandler<Event, String> {
	
	private DynamoDB dynamoDb;
    private String DYNAMODB_TABLE_NAME = "ManagerDB";

    @Override
    public String handleRequest(Event input, Context context) {
    	this.initDynamoDbClient();    	
    	Table table = dynamoDb.getTable(DYNAMODB_TABLE_NAME);
    	
    	try {
    		
    		int id = input.id;
    		
    	} 
    	catch (ParseException e1) {
    		e1.printStackTrace();
    	}
    	
    	QuerySpec querySpec = new QuerySpec()
    			.withKeyConditionExpression("Id = :v_id")
    			.withValueMap(new ValueMap().withInt(":v_id", input.id));
    	
    	
    	
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
        String response = "{ \"login_data\": [";
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
    public int id;
}