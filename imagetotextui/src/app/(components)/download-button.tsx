"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";
import * as XLSX from "xlsx";

interface ExtractedPage {
  page: number;
  text: string;
  filtered_text: string;
}

interface ExtractedFileData {
  fileName: string;
  pages: ExtractedPage[];
}

interface DownloadButtonProps {
  extractedData: ExtractedFileData[];
}

export function DownloadButton({ extractedData }: DownloadButtonProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleDownload = () => {
    const workbook = XLSX.utils.book_new();

    extractedData.forEach((file) => {
      const rows = file.pages.map((page) => ({
        "Page Number": page.page,
        "Extracted Text": page.text,
        "Filtered Text": page.filtered_text,
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        file.fileName.slice(0, 31) // Excel sheet names have a max length of 31
      );
    });

    XLSX.writeFile(workbook, "extracted-text.xlsx");
  };

  const handleCopy = () => {
    const text = extractedData.map((file) => file.pages.map((page) => page.text).join("\n")).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDoc = () => {
    const text = extractedData
      .map((file, idx) => {
        const pages = file.pages
          .map((page) => `Image: ${idx}\nText: \n\n${page.text}`)
          .join("----------------------------------------------------------------\n\n");
        return `${file.fileName}\n\n${pages}`;
      })
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted-text.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Sitick to top like navbar and bg blur*/}
      <div className="sticky top-0 z-10 p-2 flex justify-center space-x-4 bg-card/50 backdrop-blur">
        <Button onClick={handleDownload} className="m-2">
          <DownloadIcon className="mr-2 h-4 w-4" />
          Download Sheet (Excel)
        </Button>
        <Button onClick={handleDownloadDoc} className="m-2">
          <DownloadIcon className="mr-2 h-4 w-4" />
          Download All Text (Text)
        </Button>
        <Button onClick={handleCopy} className="m-2">
          {copied === true ? <CheckIcon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
          Copy All Text
        </Button>
      </div>
    </>
  );
}
