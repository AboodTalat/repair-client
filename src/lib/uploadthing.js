"use client";

import { generateReactHelpers } from "@uploadthing/react";

const baseUrl =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_REPAIR_GRAPHQL_URL
    ? process.env.NEXT_PUBLIC_REPAIR_GRAPHQL_URL.replace(/\/graphql$/, "/uploadthing")
    : null) || "/repair/uploadthing";

const { useUploadThing, uploadFiles } = generateReactHelpers({
  url: baseUrl,
});

export { useUploadThing, uploadFiles };
