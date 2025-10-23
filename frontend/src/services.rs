use crate::models::{Post, CreatePostRequest};
use reqwest::Client;
use wasm_bindgen_futures::spawn_local;
use yew::callback::Callback;

const API_BASE_URL: &str = "http://localhost:8080/api";

pub struct ApiService {
    client: Client,
}

impl ApiService {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    pub fn get_posts(&self, callback: Callback<Result<Vec<Post>, String>>) {
        let client = self.client.clone();
        spawn_local(async move {
            match client.get(&format!("{}/posts", API_BASE_URL)).send().await {
                Ok(response) => {
                    if response.status().is_success() {
                        match response.json::<Vec<Post>>().await {
                            Ok(posts) => callback.emit(Ok(posts)),
                            Err(e) => callback.emit(Err(format!("Failed to parse posts: {}", e))),
                        }
                    } else {
                        callback.emit(Err(format!("Failed to fetch posts: {}", response.status())))
                    }
                }
                Err(e) => callback.emit(Err(format!("Request failed: {}", e))),
            }
        });
    }

    pub fn create_post(&self, post: CreatePostRequest, callback: Callback<Result<Post, String>>) {
        let client = self.client.clone();
        spawn_local(async move {
            match client
                .post(&format!("{}/posts", API_BASE_URL))
                .json(&post)
                .send()
                .await
            {
                Ok(response) => {
                    if response.status().is_success() {
                        match response.json::<Post>().await {
                            Ok(post) => callback.emit(Ok(post)),
                            Err(e) => callback.emit(Err(format!("Failed to parse created post: {}", e))),
                        }
                    } else {
                        callback.emit(Err(format!("Failed to create post: {}", response.status())))
                    }
                }
                Err(e) => callback.emit(Err(format!("Request failed: {}", e))),
            }
        });
    }

    pub fn get_post(&self, id: i32, callback: Callback<Result<Post, String>>) {
        let client = self.client.clone();
        spawn_local(async move {
            match client.get(&format!("{}/posts/{}", API_BASE_URL, id)).send().await {
                Ok(response) => {
                    if response.status().is_success() {
                        match response.json::<Post>().await {
                            Ok(post) => callback.emit(Ok(post)),
                            Err(e) => callback.emit(Err(format!("Failed to parse post: {}", e))),
                        }
                    } else {
                        callback.emit(Err(format!("Failed to fetch post: {}", response.status())))
                    }
                }
                Err(e) => callback.emit(Err(format!("Request failed: {}", e))),
            }
        });
    }
}
