import { ConsumptionInput, isBookConsumptionInput, isACGNConsumptionInput, ACGNConsumptionInput } from '../index.js';

export interface Attributes {
  Database: string;
  Name: string;
  Origin: string;
  "Created At": Date;
  Review: string;
  Score: string;
  ImgUrl: string;
}

export interface BookAttributes extends Attributes {
  "Author/Publish Year/Publisher": string;
  Category: string;
  "Last Updated At": Date;
  Status: string;
}

export interface ACGNAttributes extends Attributes {
  "Type": "Anime" | "Light Novel" | "Manga" | "Game";
}

export type ConsumptionAttributes = BookAttributes | ACGNAttributes;

export const isBookAttributes = (input: ConsumptionAttributes): input is BookAttributes => input.Database === "读书";
export const isACGNAttributes = (input: ConsumptionAttributes): input is ACGNAttributes => input.Database === "ACGN";

export function transform<T extends ConsumptionInput>(input: T): ConsumptionAttributes {
  if (!input.metadata) {
    throw `Expecting metadata field with input: ${input}`;
  }

  let attributes = {
    "Database": input.database,
    "Name": input.metadata!.name,
    "Created At": new Date(Date.now()),
    "Origin": input.origin,
    "ImgUrl": input.metadata.imgUrl,
  };
  if (isBookConsumptionInput(input)) {
    return {
      ...attributes,
      "Author/Publish Year/Publisher": `${input.metadata!.authors || ""}/${input.metadata!.publishYear || ""}/${input.metadata!.publisher || ""}`,
      "Category": input.category || "Uncategorized",
      "Last Updated At": attributes["Created At"],
      "Review": input.review || "",
      "Score": input.score ? "⭐️".repeat(input.score) : "N/A",
      "Status": input.status || "",
    }
  } else if (isACGNConsumptionInput(input)) {
    return {
      ...attributes,
      "Review": input.review || "",
      "Score": "⭐️".repeat(input.score),
      "Type": input.type || inferACGNType(input),
    }
  }
  throw `Input type not recognized: ${input}`;
}

export function inferACGNType(input: ACGNConsumptionInput): ACGNAttributes["Type"] {
  if (input.type) {
    return input.type as ACGNAttributes["Type"];
  }
  if (input.metadata && input.metadata.type) {
    return input.metadata.type;
  }
  if (input.origin.includes("movie.douban.com")) {
    return "Anime";
  }
  if (input.origin.includes("douban.com/game")) {
    return "Game";
  }
  if (input.origin.includes("book.douban.com")) {
    // not able to distinguish between LN vs Manga, so defaulting to Manga
    return "Manga";
  }
  // defaulting to Anime
  return "Anime";
}