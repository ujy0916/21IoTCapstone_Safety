#작업자 등록시 업로드한 사진 faceID 컬렉션에 삽입하는 함수

import json
import boto3
from botocore.exceptions import ClientError

bucket='{Bucket_name}'
collection_id='{Collection_id}'
client=boto3.client('rekognition')

photo='{photo.jpg}'

def lambda_handler(event, context):
    indexed_faces_count=add_faces_to_collection()
    print("Faces indexed count: " + str(indexed_faces_count))
    
    
#Add_FaceID_to_Collection
def add_faces_to_collection(): 
    response=client.index_faces(CollectionId=collection_id,
                                Image={'S3Object':{'Bucket':bucket,'Name':photo}},
                                ExternalImageId=photo.split('/')[1], #특수문자 들어가면 안됨.
                                MaxFaces=1,
                                QualityFilter="AUTO",
                                DetectionAttributes=['ALL'])

    print ('Results for ' + photo) 	
    print('Faces indexed:')						
    for faceRecord in response['FaceRecords']:
         print('  Face ID: ' + faceRecord['Face']['FaceId'])
         print('  Location: {}'.format(faceRecord['Face']['BoundingBox']))

    print('Faces not indexed:')
    for unindexedFace in response['UnindexedFaces']:
        print(' Location: {}'.format(unindexedFace['FaceDetail']['BoundingBox']))
        print(' Reasons:')
        for reason in unindexedFace['Reasons']:
            print('   ' + reason)
    return len(response['FaceRecords'])