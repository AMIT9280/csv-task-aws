const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const ndjson = require('ndjson'); 
const { v4: uuidv4 } = require('uuid');
const { Parser } = require('papaparse');

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.processS3File = async (event, context) => {
  try {
    const { Records: records } = event;
    const bucket = records[0].s3.bucket.name;
    const key = records[0].s3.object.key;

    // Read the NDJSON file from S3
    const s3ReadStream = s3.getObject({ Bucket: bucket, Key: key }).createReadStream();

    // Process each record in the NDJSON file
    const parser = ndjson.parse();
    s3ReadStream.pipe(parser);

    for await (const record of parser) {
      const { name, phoneNumber, dateOfBirth, emailId, country } = record;
      const uuid = uuidv4();

      // Store the record in DynamoDB
      const params = {
        TableName: 'CsvTaskTable',
        Item: {
          uuid,
          name,
          phoneNumber,
          dateOfBirth,
          emailId,
          country,
        },
      };
      await dynamodb.put(params).promise();
    }

    console.log('Processing completed.');

    return {
      status: 200,
      body: 'Processing completed successfully.',
    };
  } catch (error) {
    console.error('Error processing S3 file:', error);
    return {
      status: 500,
      body: 'Error processing S3 file.',
    };
  }
};
exports.archiveS3File = async (event, context) => {
  try {
    const { Records: records } = event;
    const bucket = records[0].s3.bucket.name;
    const key = records[0].s3.object.key;

    const getObjectParams = {
      Bucket: bucket,
      Key: key,
    };

    const { Body: fileData } = await s3.getObject(getObjectParams).promise();

    const timestamp = new Date().getTime();
    const archiveKey = `archive/Archive_${timestamp}.csv`;

   //convert fileData to CSV format
    const csvData = convertToCSV(fileData); 

    // Upload the converted CSV file to the archive folder
    const putObjectParams = {
      Bucket: bucket,
      Key: archiveKey,
      Body: csvData,
    };
    await s3.putObject(putObjectParams).promise();

    console.log(`File archived: s3://${bucket}/${archiveKey}`);

    return {
      status: 200,
      body: 'File archived successfully.',
    };
  } catch (error) {
    console.error('Error archiving S3 file:', error);
    return {
      status: 500,
      body: 'Error archiving S3 file.',
    };
  }
};
// convert fileData to CSV format
function convertToCSV(fileData) {
  const parser = new Parser();
  const { data: csvData } = parser.parse(fileData.toString());
  console.log(csvData);
  return csvData.map((row) => row.join(',')).join('\n');
}