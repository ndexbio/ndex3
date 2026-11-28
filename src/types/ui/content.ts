/**
 * Types for the content service responses
 */

export interface FeaturedContentItem {
  type: string;
  text:string;
  imageURL: string;
  title:string;
  URL?: string;
  UUID?: string;
}

export interface FeaturedContentResponse {
  items: FeaturedContentItem[];
}

export interface FeaturedNetwork {
  type: string;
  UUID: string;
  title: string;
}

export interface FeaturedNetworkResponse {
  items: FeaturedNetwork[];
}