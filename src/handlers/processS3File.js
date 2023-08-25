const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const ndjson = require('ndjson');
const { v4: uuidv4 } = require('uuid');
// const { Parser } = require('papaparse');
const createCsvWriter = require('csv-writer').createObjectCsvWriter

const dynamodb = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event, context) => {
  try {
    const { Records: records } = event;
    const bucket = records[0].s3.bucket.name;
    const key = decodeURIComponent(records[0].s3.object.key.replace(/\+/g, " "));


    // Read the NDJSON file from S3
    const s3ReadStream = s3.getObject({ Bucket: bucket, Key: key }).createReadStream();

    // Process each record in the NDJSON file
    const parser = ndjson.parse({
      batchSize: 3,
    });
    s3ReadStream.pipe(parser);

    const dynamoDBPromises = [];
    const csvData = []

    for await (const record of parser) {
      const { name, phoneNumber, dateOfBirth, emailId, country } = record;
      const uuid = uuidv4();

      // Store the record in DynamoDB
      const params = {
        TableName: process.env.CsvTaskTable,
        Item: {
          uuid,
          name,
          phoneNumber,
          dateOfBirth,
          emailId,
          country,
        },
      };
      dynamoDBPromises.push(dynamodb.put(params).promise());
      csvData.push({
        uuid,
        name,
        phoneNumber,
        dateOfBirth,
        emailId,
        country,
      })
    }
    await Promise.all(dynamoDBPromises);
    // Convert NDJSON to CSV format
    const csvWriter = createCsvWriter({
      path: '/tmp/data.csv',
      header: [
        { id: 'uuid', title: 'UUID' },
        { id: 'name', title: 'NAME' },
        { id: 'phoneNumber', title: 'PHONE NUMBER' },
        { id: 'dateOfBirth', title: 'DATE OF BIRTH' },
        { id: 'emailId', title: 'EMAIL ID' },
        { id: 'country', title: 'COUNTRY' }
      ],
      alwaysQuote: true,
      shouldAddQuoteWhenEmpty:true

    });
    await csvWriter.writeRecords(csvData);

    // Upload the converted CSV file to the archival folder in S3
    const timestamp = new Date().getTime();
    const archiveKey = `archive/Archive_${timestamp}.csv`;

    const putObjectParams = {
      Bucket: bucket,
      Key: archiveKey,
      Body: require('fs').createReadStream('/tmp/data.csv'),
    };
    await s3.putObject(putObjectParams).promise();
    console.log(`File archived: s3://${bucket}/${archiveKey}`);

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
