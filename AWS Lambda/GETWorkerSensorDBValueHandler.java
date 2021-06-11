package com.amazonaws.lambda.demo;

import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

import org.apache.http.ParseException;


import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.ItemCollection;
import com.amazonaws.services.dynamodbv2.document.QueryOutcome;
import com.amazonaws.services.dynamodbv2.document.ScanOutcome;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.spec.GetItemSpec;
import com.amazonaws.services.dynamodbv2.document.spec.QuerySpec;
import com.amazonaws.services.dynamodbv2.document.utils.NameMap;
import com.amazonaws.services.dynamodbv2.document.utils.ValueMap;
import com.amazonaws.services.dynamodbv2.model.AttributeValue;
import com.amazonaws.services.dynamodbv2.model.ConditionalCheckFailedException;
import com.amazonaws.services.dynamodbv2.model.ScanRequest;
import com.amazonaws.services.dynamodbv2.model.ScanResult;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

import software.amazon.ion.Timestamp;

/*
 * GETWorkerSeonsorDBValueFunction
 * WorkerSensorDB의 값을 가져올 떄 사용
 * 메서드 : /workersensordb/{id} -GET-
 */

public class GETWorkerSensorDBValueHandler implements RequestHandler<Event, String> {
	private DynamoDB dynamoDb;
    private String DYNAMODB_TABLE_NAME = "WorkerSensorDB";
    long timestamp = 0;
    long end_timestamp = 0;

    @Override
    public String handleRequest(Event input, Context context) {
    	this.initDynamoDbClient();    	
    	Table table = dynamoDb.getTable(DYNAMODB_TABLE_NAME);
    	
    	Date date = new Date();
    	SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
    	sdf.setTimeZone(TimeZone.getTimeZone("Asia/Seoul"));
        String timeString = sdf.format(date);
        Date timeDate;
		try {
			timeDate = sdf.parse(timeString);
			timestamp = timeDate.getTime()/1000;
			end_timestamp = timestamp + 60*60*24;
		} catch (java.text.ParseException e1) {
			return null;
		}
    	
        
    	System.out.println(timestamp);
    	
    	
    	QuerySpec querySpec = new QuerySpec()
    			.withKeyConditionExpression("WorkerId = :v_id and #t between :from and :to")
    			.withNameMap(new NameMap().with("#t", "workTime"))
    			.withValueMap(new ValueMap().withString(":v_id", input.id).withNumber(":from", timestamp).withNumber(":to", end_timestamp));
    	
    	
    	
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
        String response = "{ \"WorkerSensorDB_data\": [";
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
    public String id;
}