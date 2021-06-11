'''
helmet_id값을 가져와서 변수에 저장하고 이를 토대로 s3에서 이미지 파일 가져와 영상 식별 시도.
이후 그 결과를 mqtt 통신으로 통보하고 SUCCESS일 경우에만 Dynamodb에서 helmet_id와 매칭시켜줌
'''

import json
import boto3
from botocore.exceptions import ClientError
from pprint import pprint

bucket='{BUCKET_NAME}'
region='{Region_name}'
collection_id='{Collection_id}'
client=boto3.client('rekognition')
s3_client = boto3.client('s3')
partitionKEY = 'PartitionKEY'

def Split_photo(text):
    return text.split('.j')[0]
    
def lambda_handler(event, context):
    mqtt = boto3.client('iot-data', region_name=region) #IoTCore와 연결
    helmet_id = (str(event['id'])).split('C')[0]
    file_name = helmet_id + '.jpg'
    photo = 'Helmet/'+file_name

    #Face Identification
    workerID = search_face(photo)
    print(workerID)
    
    #Publish - esp32/sub/recognition (payload 보내기)
    mqtt = boto3.client('iot-data', region_name=region)

    if workerID == '' : #일치하는 사람이 없거나 사람이 찍히지 않은 경우
        response = mqtt.publish(
            topic = 'esp32/sub/recognition',
            qos=0,
            payload = json.dumps({ "payload" : 'FAIL'})
        )

    #
    else: 
        update_response = update_HelmetMatchingDB(helmet_id, workerID)
        print("Update table succeeded:")
        pprint(update_response, sort_dicts=False)
        
        response = mqtt.publish(
            topic = 'esp32/sub/recognition',
            qos=0,
            payload = json.dumps({ "payload" : 'SUCCESS'})
        )
        print(response)
    
    return workerID
    
    
def search_face(photo):
    threshold = 70
    maxFaces=2
    faces=[]
    
    try:
        response=client.search_faces_by_image(CollectionId=collection_id,
                                Image={'S3Object':{'Bucket':bucket,'Name':photo}},
                                FaceMatchThreshold=threshold,
                                MaxFaces=maxFaces)
        faceMatches=response['FaceMatches']
        print ('Matching faces')
        
        maxSim = 0
        filename = ''
        for match in faceMatches:
                print ('일치하는 사람:' + match['Face']['ExternalImageId'].split('.j')[0])
                print (match['Face']['ExternalImageId'].split('X')[1])
                print ('유사도: ' + "{:.2f}".format(match['Similarity']) + "%")
                print
                
                if (maxSim < match['Similarity']):
                    maxSim = match['Similarity']
                    filename = match['Face']['ExternalImageId']
                filename=filename.split('.jpg')[0]   
        return filename

    except IndexError as e:
        print(e)
        print('Unknown face')
        return ''
    
    except Exception as e:
        print(e)
        return ''
    
            
def delete_from_s3(photo):
    try:
        s3 = boto3.client(
            "s3" #, aws_access_key_id=aws_key, aws_secret_access_key=aws_secret
        )
        s3.delete_object(Bucket=bucket, Key=photo)
        return True
    except Exception as ex:
        print(str(ex))
        return False


def get_table(helmet_id):
    dynamodb=None
    if not dynamodb:
        dynamodb = boto3.resource('dynamodb', endpoint_url="https://dynamodb.{REGION_name}.amazonaws.com")

    table = dynamodb.Table('MatchingDB')

    try:
        response = table.get_item(Key={'partitionKEY': partitionKEY, 'HelmetId': helmet_id})
    except ClientError as e:
        print(e.response['Error']['Message'])
    else:
        return response['Item']


def update_HelmetMatchingDB(helmet_id, workerID):
    dynamodb=None
    if not dynamodb:
        dynamodb = boto3.resource('dynamodb', endpoint_url="https://dynamodb.{REGION_name}.amazonaws.com")

    table = dynamodb.Table('MatchingDB')

    response = table.update_item(
        Key={
            'partitionKEY': partitionKEY,
            'HelmetId': helmet_id
        },
        UpdateExpression="SET workerId=:w",
        ExpressionAttributeValues={
            ':w': workerID
        },
        ReturnValues="UPDATED_NEW"
    )
    return response
