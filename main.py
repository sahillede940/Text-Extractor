# main.py

import time
import base64
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from typing import List
from io import BytesIO
from dotenv import load_dotenv
import os
from fastapi.middleware.cors import CORSMiddleware

from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from msrest.authentication import CognitiveServicesCredentials

load_dotenv()

# Azure subscription credentials
subscription_key = os.getenv('API_KEY')
endpoint = os.getenv('ENDPOINT_URL')

computervision_client = ComputerVisionClient(
    endpoint, CognitiveServicesCredentials(subscription_key))

app = FastAPI()

# CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def encode_image_to_base64(image_bytes):
    """
    Encodes image bytes to a base64 string for JSON response.
    """
    return base64.b64encode(image_bytes).decode("utf-8")


def extract_text_from_stream(stream):
    """
    Extracts text from an image or PDF page using Azure's OCR service.
    """
    read_operation = computervision_client.read_in_stream(stream, raw=True)
    operation_location = read_operation.headers["Operation-Location"]
    operation_id = operation_location.split("/")[-1]

    while True:
        read_result = computervision_client.get_read_result(operation_id)
        if read_result.status not in ['notStarted', 'running']:
            break
        time.sleep(1)

    if read_result.status == 'succeeded':
        extracted_text = ''
        for page in read_result.analyze_result.read_results:
            for line in page.lines:
                extracted_text += line.text + '\n'
        return extracted_text
    return None


@app.post("/extract-images")
async def extract_images(files: List[UploadFile] = File(...)):
    """
    Handles multiple image uploads, returns extracted text and image in base64 format.
    """
    try:
        results = []
        for file in files:
            contents = await file.read()
            image_stream = BytesIO(contents)
            text = extract_text_from_stream(image_stream)

            # Encode the image in base64 for easy JSON transfer
            base64_image = encode_image_to_base64(contents)
            results.append({
                "type": "image",
                "filename": file.filename,
                "text": text if text else "Error: OCR operation failed.",
                "image_base64": base64_image
            })
        return JSONResponse(content=results)
    except Exception as e:
        return JSONResponse(content={"error": "Error: OCR operation failed."})


@app.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    """
    Handles PDF upload, checks if it's text-readable or contains images,
    extracts text page-wise, and returns text and base64 image for each page.
    """
    try:
        contents = await file.read()
        pdf_stream = BytesIO(contents)
        text = extract_text_from_stream(pdf_stream)
        
        # Reset the stream and process again if OCR was needed
        pdf_stream.seek(0)
        read_response = computervision_client.read_in_stream(pdf_stream, raw=True)
        operation_location = read_response.headers["Operation-Location"]
        operation_id = operation_location.split("/")[-1]

        while True:
            read_result = computervision_client.get_read_result(operation_id)
            if read_result.status not in ['notStarted', 'running']:
                break
            time.sleep(1)

        extracted_pages = []
        if read_result.status == 'succeeded':
            for idx, page in enumerate(read_result.analyze_result.read_results):
                page_text = '\n'.join([line.text for line in page.lines])
                
                extracted_pages.append({
                    "type": "pdf",
                    "page": idx + 1,
                    "text": page_text,
                    "image_base64": ""
                })
            return JSONResponse(content=extracted_pages)
        else:
            return JSONResponse(content={"error": "Error: OCR operation failed."})
    except Exception as e:
        return JSONResponse(content={"error": "Error: OCR operation failed."})


# To run the application, use: uvicorn main:app --reload
