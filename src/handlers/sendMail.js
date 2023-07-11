const AWS = require('aws-sdk');

const ses = AWS.SES({region: 'ap-south-1'})

async function sendMail(event, context) {

  const records = event.Records[0];
  console.log('records processing', records);
  const email =JSON.parse(records.body)
  const {subject, body ,recipient} =  email

  const params =  {
    Source: 'amit928080@gmail.com',
    Destination: {
      ToAddress: [recipient],
    },
    Message:{
      Body:{
        Text: {
          Data:body
        },
      },
      Subject: {
        Data: subject
      },
    },
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log(result);
    return result;
  } catch (error) {
    console.error(error);
  }
}

export const handler = sendMail;


