"use client";

import React, { useState } from "react";
import { FileUploader } from "./(components)/file-uploader";
import { ExtractedContent } from "./(components)/extracted-content";
import { DownloadButton } from "./(components)/download-button";
import { Card, CardContent } from "@/components/ui/card";
import { API_URL } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Define TypeScript types for the API response
interface ExtractedPage {
  page: number;
  text: string;
  image_base64: string;
  type: "pdf" | "image"; // Adding 'type' property
}

interface ExtractedFileData {
  fileName: string;
  pages: ExtractedPage[];
}

export default function TextExtractor() {
  const [extractedData, setExtractedData] = useState<ExtractedFileData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (files: FileList) => {
    setIsLoading(true);
    try {
      // Separate image files and PDF files
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
      const pdfFiles = Array.from(files).filter((file) => file.type === "application/pdf");

      const results: ExtractedFileData[] = [];

      // Handle the images in a single request
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((file) => formData.append("files", file));

        const response = await fetch(`${API_URL}/extract-images`, {
          method: "POST",
          body: formData,
        });

        const data: ExtractedPage[] = await response.json();
        toast({
          title: "Success",
          description: `Extracted text from ${imageFiles.length} images`,
        });
        results.push({
          fileName: "Uploaded Images",
          pages: data,
        });
      }

      // Handle each PDF in separate requests
      for (const pdfFile of pdfFiles) {
        const formData = new FormData();
        formData.append("file", pdfFile);

        const response = await fetch(`${API_URL}/extract-pdf`, {
          method: "POST",
          body: formData,
        });

        const data: ExtractedPage[] = await response.json();
        toast({
          title: "Success",
          description: `Extracted text from ${pdfFile.name}`,
        });
        results.push({
          fileName: pdfFile.name,
          pages: data,
        });
      }

      setExtractedData(results);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error" + e,
        description: "Failed to extract text from the uploaded files",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="p-6">
          <h1 className="text-4xl font-extrabold mb-6 text-center bg-gradient-to-r from-green-400 to-blue-600 text-transparent bg-clip-text uppercase">
            Baazigar's Personal Text Extractor
          </h1>

          <div className="space-y-6">
            <FileUploader onUpload={handleFileUpload} isLoading={isLoading} />

            {extractedData.length > 0 && (
              <div className="space-y-4">
                <DownloadButton extractedData={extractedData} />
                <ExtractedContent data={extractedData} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
