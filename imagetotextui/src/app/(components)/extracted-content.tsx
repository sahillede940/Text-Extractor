"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyIcon, CheckIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ExtractedPage {
  type: "pdf" | "image";
  page: number;
  text: string;
  image_base64: string;
}

interface ExtractedFileData {
  fileName: string;
  pages: ExtractedPage[];
}

interface ExtractedContentProps {
  data: ExtractedFileData[];
}

export function ExtractedContent({ data }: ExtractedContentProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = async (text: string, index: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(index);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className="space-y-6">
      {data.map((file, fileIndex) => (
        <Card key={fileIndex} className="bg-card/50 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">{file.fileName}</h3>
            <div className="space-y-4">
              {file.pages.map((page, pageIndex) => (
                <div key={pageIndex} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm text-muted-foreground">Page {page.page}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(page.text, `${fileIndex}-${pageIndex}`)}
                    >
                      {copiedText === `${fileIndex}-${pageIndex}` ? (
                        <CheckIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className={`grid  gap-4 ${page.image_base64 ? "grid-cols-1 md:grid-cols-2" : ""}`}>
                    {page.image_base64 && (
                      <div className="relative" style={{ height: "300px" }}>
                        {page.type === "pdf" ? (
                          <embed
                            src={`data:application/pdf;base64,${page.image_base64}`}
                            type="application/pdf"
                            className="rounded-lg w-full h-full"
                            title={`Page ${page.page}`}
                          />
                        ) : (
                          <img
                            src={`data:image/png;base64,${page.image_base64}`}
                            alt={`Page ${page.page}`}
                            className="rounded-lg object-cover w-full h-full"
                          />
                        )}
                      </div>
                    )}

                    <ScrollArea className="rounded-lg border p-4" style={{ height: "300px" }}>
                      <pre className="text-sm whitespace-pre-wrap font-mono">{page.text}</pre>
                    </ScrollArea>
                  </div>
                  <Separator className="my-4" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
