const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const ndjson = require('ndjson');
const { v4: uuidv4 } = require('uuid');
const { Parser } = require('papaparse');
const createCsvWriter = require('csv-writer').createObjectCsvWriter

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

    const csvData = []

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
      csvData.push(params)
    }

    // Upload the converted CSV file to the archival folder in S3
    const timestamp = new Date().getTime();
    const archiveKey = `archive/Archive_${timestamp}.csv`;

    //create Csv File
    const csvWriter = createCsvWriter({
      path: archiveKey,
      header:['UUID', 'NAME', 'PHONE NUMBER', 'DATE OF BIRTH', 'EMAIL ID', 'COUNTRY'],
      alwaysQuote: true
      
    });

  try{
    csvWriter.writeRecords(csvData).then(() => {
      console.log(`File archived: s3://${bucket}/${archiveKey}`);
      return s3.readFile('data.csv');
    });
  }catch(error){
    console.log('Error while writing CSV file:', error)
    throw new Error('Error while writing CSV file:')
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
