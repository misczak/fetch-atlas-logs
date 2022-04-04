# fetch-atlas-logs

This is a simple utility that can be uploaded into a Lambda function and run in order to grab logs out of MongoDB Atlas.

## Setup

### Code

1. Clone this repository and run `npm install` on your machine to pull down the necessary dependencies. 

2. Navigate to the project directory and run `zip -r function.zip .` to create a zip archive of the Node project. 

3. In the AWS console, create a Lambda function and select **Upload from > .zip file** and select the archive you just created.

### AWS

You'll need to create a role for your Lambda function to operate under. It should have access to putting records into a Kinesis data stream, writing logs to CloudWatch Logs, and be able to retrieve encrypted values from Systems Manager Parameter Store. 

Set up your MongoDB Atlas API keys (public and private) in Systems Manager Parameter Store. Remember the names of the parameters you provided there, as you will need to provide them when calling the function. The code also assumes you are encrypting these values with KMS.

Create a Kinesis data stream and ideally a delivery stream where the input is the data stream and the output is an S3 bucket you control. Assign the delivery stream a role that allows it to write to the S3 bucket. 

## Usage

You will also need to figure out the start and end times of the log file you want to retrieve and convert those to UNIX epoch time for the `start` and `end` variables. Last, fill in your Atlas project's identifier as `projectID` and a hostname from a member of your cluster in `hostname`. 

If you want to retrieve the audit log file, leave the log file variable alone and ensure that Auditing is enabled on your Atlas Cluster. If you want to retrieve regular logs, you can use the `mongodb.gz` log file instead. See the [MongoDB Atlas Logging](https://www.mongodb.com/docs/atlas/reference/api/logs/) documentation page for more information. 


## Testing

After running the function, you should see log entries immediately appear in CloudWatch Logs showing individual log entries. After a few minutes, all of the log entries should flow through Kinesis and end up in a single file in the S3 bucket you configured as the output for the Delivery Stream. 
