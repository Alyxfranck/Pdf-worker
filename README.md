# PDF Generator Service

A standalone service for generating PDF exercise plans.

## Setup


1. Install dependencies:

```bash
npm install
```


2. Run the service:

```bash
npm start
```

The service will be available at http://localhost:3001.

## API Endpoints

### POST /generate-pdf

Generates a PDF exercise plan based on the provided data.

**Request Body:**

```json
{
  "patientName": "John Doe",
  "patientNotes": "Patient notes here",
  "date": "2023-05-15",
  "exercises": [
    {
      "id": 1,
      "title": "Exercise Title",
      "description": "Exercise description",
      "imageBase64": "data:image/jpeg;base64,..."
    }
  ]
}
```

**Response:**

* Content-Type: application/pdf
* The PDF file as a binary stream

## Deployment

This service includes a Dockerfile for containerized deployment. You can deploy it to:


1. Digital Ocean App Platform
2. Heroku
3. Railway
4. Google Cloud Run
5. AWS Elastic Beanstalk

## Security Considerations

For production:


1. Add API key authentication
2. Configure CORS to only allow requests from your application
3. Set up rate limiting


