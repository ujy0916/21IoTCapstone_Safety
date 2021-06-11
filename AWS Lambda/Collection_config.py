# Collection 관리 함수

import json
import boto3
from botocore.exceptions import ClientError

bucket='{Bucket_name}'
client=boto3.client('rekognition')

def lambda_handler(event, context):
    collection_id='{Collection_id}'
    
    #컬렉션 생성
    create_collection(collection_id)
    status_code=delete_collection(collection_id)
    print('Status code: ' + str(status_code))
    
    #컬렉션 출력
    describe_collection(collection_id)
    
    #부분삭제
    faces=[]
    faces.append("cfb87418-e14e-4116-9f54-88fa33bc5ffd")
    faces_count=delete_faces_from_collection(collection_id, faces)
    print("deleted faces count: " + str(faces_count))
    
    #전체삭제
    delete_all_faces_from_collection(collection_id)

    faces_count=list_faces_in_collection(collection_id)
    print("faces count: " + str(faces_count))
    
    return "success!"
    
#Delete_FaceID_from_Collection(부분 삭제)
def delete_faces_from_collection(collection_id, faces):
    faces
    response=client.delete_faces(CollectionId=collection_id,
                           FaceIds=faces)

    print(str(len(response['DeletedFaces'])) + ' faces deleted:') 							
    for faceId in response['DeletedFaces']:
         print (faceId)
    return len(response['DeletedFaces'])
    
#Delete_FaceID_from_Collection(전체 삭제)
def delete_all_faces_from_collection(collection_id):
    maxResults=2
    faces_count=0
    tokens=True
    faces=[]

    client=boto3.client('rekognition')
    response=client.list_faces(CollectionId=collection_id,
                               MaxResults=maxResults)
    i=0
    while tokens:
        faces=response['Faces']
        for face in faces:
            faceid = face['FaceId']
            faces.insert(i, faceid)
            i += 1
            print(face['FaceId'] + ' 삭제되었습니다.')
            faces_count+=1
        if 'NextToken' in response:
            nextToken=response['NextToken']
            response=client.list_faces(CollectionId=collection_id,
                                       NextToken=nextToken,MaxResults=maxResults)
        else:
            tokens=False
    client.delete_faces(CollectionId=collection_id, FaceIds=faces)
    
#Describe_FaceID_from_Colletion
def list_faces_in_collection(collection_id):
    maxResults=2
    faces_count=0
    tokens=True

    client=boto3.client('rekognition')
    response=client.list_faces(CollectionId=collection_id,
                               MaxResults=maxResults)

    print('Faces in collection ' + collection_id)

 
    while tokens:

        faces=response['Faces']

        for face in faces:
            print ('파일이름: '+ face['ExternalImageId'] + ' / faceID: '+ face['FaceId'])
            #print (face)
            print
            faces_count+=1
        if 'NextToken' in response:
            nextToken=response['NextToken']
            response=client.list_faces(CollectionId=collection_id,
                                       NextToken=nextToken,MaxResults=maxResults)
        else:
            tokens=False
    return faces_count

#컬렉션 생성
def create_collection(collection_id):
    print('Creating collection:' + collection_id)
    response=client.create_collection(CollectionId=collection_id)
    print('Collection ARN: ' + response['CollectionArn'])
    print('Status code: ' + str(response['StatusCode']))
    print('Done...')
    
#컬렉션 삭제
def delete_collection(collection_id):
    print('Attempting to delete collection ' + collection_id)
    status_code=0
    try:
        response=client.delete_collection(CollectionId=collection_id)
        status_code=response['StatusCode']
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            print ('The collection ' + collection_id + ' was not found ')
        else:
            print ('Error other than Not Found occurred: ' + e.response['Error']['Message'])
        status_code=e.response['ResponseMetadata']['HTTPStatusCode']
    return(status_code)

#컬렉션 정보 출력
def describe_collection(collection_id):

    print('Attempting to describe collection ' + collection_id)
    try:
        response=client.describe_collection(CollectionId=collection_id)
        print("Collection Arn: "  + response['CollectionARN'])
        print("Face Count: "  + str(response['FaceCount']))
        print("Face Model Version: "  + response['FaceModelVersion'])
        print("Timestamp: "  + str(response['CreationTimestamp']))


    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            print ('The collection ' + collection_id + ' was not found ')
        else:
            print ('Error other than Not Found occurred: ' + e.response['Error']['Message'])
    print('Done...')

