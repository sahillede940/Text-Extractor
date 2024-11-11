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
from fastapi import HTTPException

import openai  # Import OpenAI

load_dotenv()

# Azure subscription credentials
subscription_key = os.getenv('OCR_API_KEY')
endpoint = os.getenv('OCR_ENDPOINT_URL')
computervision_client = ComputerVisionClient(
    endpoint, CognitiveServicesCredentials(subscription_key))


openai.api_type = "azure"
openai.azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")  # Your Azure OpenAI endpoint
openai.api_version = os.getenv("AZURE_OPENAI_API_VERSION")  # Your Azure OpenAI API version
openai.api_key = os.getenv("AZURE_OPENAI_API_KEY")  # Your Azure OpenAI API key

# The deployment name you chose when you deployed the model in Azure OpenAI
deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")

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


def process_text_with_gpt4(text):
    """
    Processes the extracted text using OpenAI's GPT-4 model to 'clear' the text.
    """
    try:
        # Set up the OpenAI API request
        response = openai.chat.completions.create(
            model=deployment_name,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that cleans up OCR text. Your task is to make the text more readable. Do not try to change the meaning of the text just clean it up."},
                {"role": "user", "content": text}
            ],
            temperature=0
        )

        # Get the response text
        filtered_text = response.choices[0].message.content
        return filtered_text
    except Exception as e:
        # Handle exceptions
        print(f"Error processing text with GPT-4: {e}")
        return "Error processing text with GPT-4"


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

            # Process the extracted text with GPT-4
            filtered_text = process_text_with_gpt4(
                text) if text else "Error: OCR operation failed."

            # Encode the image in base64 for easy JSON transfer
            base64_image = encode_image_to_base64(contents)
            results.append({
                "type": "image",
                "filename": file.filename,
                "text": text if text else "Error: OCR operation failed.",
                "filtered_text": filtered_text,
                "image_base64": base64_image
            })
        return JSONResponse(content=results)
    except Exception as e:
        print(f"Error in extract_images: {e}")
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
        read_response = computervision_client.read_in_stream(
            pdf_stream, raw=True)
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

                # Process the extracted text with GPT-4
                filtered_text = process_text_with_gpt4(
                    page_text) if page_text else "Error: OCR operation failed."

                extracted_pages.append({
                    "type": "pdf",
                    "page": idx + 1,
                    "text": page_text,
                    "filtered_text": filtered_text,
                    "image_base64": ""
                })
            return JSONResponse(content=extracted_pages)
        else:
            return HTTPException(status_code=400, detail="Error: PDF extraction failed.")
    except Exception as e:
        print(f"Error in extract_pdf: {e}")
        return HTTPException(status_code=400, detail="Error: PDF extraction failed.")
