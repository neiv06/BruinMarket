use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Post {
    pub id: i32,
    pub title: String,
    pub description: String,
    pub price: f64,
    pub category: String,
    #[serde(rename = "type")]  // Map JSON "type" to "post_type"
    pub post_type: String,
    pub author: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePostRequest {
    pub title: String,
    pub description: String,
    pub price: f64,
    pub category: String,
    #[serde(rename = "type")]  // Map JSON "type" to "post_type"
    pub post_type: String,
    pub author: String,
}