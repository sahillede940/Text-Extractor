"use client";

import React, { useRef, useState, useEffect } from "react";
import { FileIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface FileUploaderProps {
  onUpload: (files: FileList) => void;
  isLoading: boolean;
}

export function FileUploader({ onUpload, isLoading }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [filePreviews, setFilePreviews] = useState<{ [key: string]: string }>({});

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    setFiles(droppedFiles);
    generatePreviews(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      setFiles(selectedFiles);
      generatePreviews(selectedFiles);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = () => {
    if (files) {
      onUpload(files);
    }
  };

  const generatePreviews = (fileList: FileList) => {
    const previews: { [key: string]: string } = {};
    Array.from(fileList).forEach((file) => {
      if (file.type.startsWith("image/")) {
        previews[file.name] = URL.createObjectURL(file);
      }
    });
    setFilePreviews(previews);
  };

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      Object.values(filePreviews).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filePreviews]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors mx-16"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-col items-center space-y-4 mb-10">
        <div className="p-4 bg-muted rounded-full">
          {isLoading ? (
            <Progress value={75} className="w-12 h-12" />
          ) : (
            <FileIcon className="h-12 w-12 text-muted-foreground" />
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{isLoading ? <ProgressBar /> : "Upload Files"}</h3>
          <p className="text-sm text-muted-foreground">Drop your pdf/images here or click to browse</p>
        </div>

        <Button variant={"outline"} disabled={isLoading} onClick={handleClick}>
          Select Files
        </Button>

        <Button variant={files ? "default" : "outline"} onClick={handleFileUpload} disabled={!files}>
          <UploadIcon className="mr-2 h-4 w-4" />
          Upload Files
        </Button>
      </div>

      {files && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 mb-3">
          {Array.from(files).map((file) => (
            <div key={file.name} className="flex flex-col items-center space-y-1 p-2 border rounded-lg">
              <FileIcon className="h-4 w-4 mb-1" />
              <span className="text-xs text-center truncate w-full">{file.name}</span>

              {filePreviews[file.name] && (
                <img src={filePreviews[file.name]} alt={file.name} className="w-[100%] rounded-md object-cover" />
              )}

              <div className="flex space-x-1 mt-1">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFiles(null);
                    setFilePreviews({});
                  }}
                >
                  Remove
                </Button>

                <Button variant="ghost" onClick={handleFileUpload}>
                  Upload
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
