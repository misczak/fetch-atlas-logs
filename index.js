const AWS = require('aws-sdk');
const axiosDigest = require('@mhoc/axios-digest-auth').default;
const zlib = require('zlib');

exports.handler = async (event) => {
  
  // If these are run outside of AWS Lambda, you will need to pass each of
  // these a config parameter that has valid AWS account credentials
  // and the region where your SSM and Kinesis resources are.
  const SSM = new AWS.SSM();
  const kinesis = new AWS.Kinesis();
  
  // Build System Manager parameters with the key name parameters entered by
  // the user
  const ssmParams = {
    Names: [event.publicKey, event.privateKey],
    WithDecryption: true
  };
  
  // TO-DO: Enter kinesis partition key and stream name
  // Kinesis parameters used to put records. Can eventually
  // store these in Systems Manager Parameter Store
  const kinesisPartitionKey = "";
  const kinesisStreamName = "";
  
  const promiseData = await SSM.getParameters(ssmParams).promise();
  
  const publicKey = promiseData.Parameters[1].Value;
  const privateKey = promiseData.Parameters[0].Value;
  
  // TO-DO: Enter the Unix epoch time parameters for your window of logs
  // Start and end timestamps to grab logs
  const start = 0;
  const end = 0;
  
  // TO-DO: Provide your projectID and a hostname from your cluster. You 
  // can also change the type of logfile to retrieve. Make sure to enable
  // auditing in Atlas if you are retrieving the audit log file.
  // Parameters to use to build the URL for the log file. Can eventually 
  // store these in Systems Manager Parameter Store 
  const projectID = "";
  const hostname = "";
  const logfile = "mongodb-audit-log.gz";
  
  const logURL = `https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectID}/clusters/${hostname}/logs/${logfile}?startDate=${start}&endDate=${end}`;

  
  const digestAuth = new axiosDigest({
    username: publicKey,
    password: privateKey
  });
  
  // Use axios digest auth to grab the log file as an array buffer 
  const {data} = await digestAuth.request({
    headers: { Accept: "*/*" },
    method: "GET",
    url: logURL,
    responseType: 'arraybuffer'
  });
  
  // Unzip the log file and start to parse it, separating entries into
  // individual records
  zlib.gunzip(data, async function (_err, output) {
      const logArray = output.toString('utf-8').split("\n");
      let kinesisRecords = [];
      
      for (let i = 0; i < logArray.length; i++) {
        
        const logObject = {
          "Data": logArray[i],
          "PartitionKey": kinesisPartitionKey
        };
        
        kinesisRecords.push(logObject);
        // Log the value out to CloudWatch for sanity check
        console.log('Item ', i, ': ', logArray[i]);
        
        // PutRecords only supports batches of 500 records, so have to roll over
        // when we hit that limit
        if (kinesisRecords.length === 500) {
          const response = await kinesis.putRecords({
            "Records": kinesisRecords,
            "StreamName": kinesisStreamName
          }).promise();
          kinesisRecords = [];
        }
        
      }
      
      // Do the last put records for whatever is left
      const response = await kinesis.putRecords({
        "Records": kinesisRecords,
        "StreamName": kinesisStreamName
      }).promise();
      
      return response; //this returns null but whatever
      
  });
  
};
