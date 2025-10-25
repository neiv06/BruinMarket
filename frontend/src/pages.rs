use yew::prelude::*;
use yew_router::prelude::*;
use crate::models::{Post, CreatePostRequest};
use crate::services::ApiService;
use crate::Route;
use web_sys::{FormData, HtmlInputElement};
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::spawn_local;

#[function_component(CreatePost)]
pub fn create_post() -> Html {
    let title = use_state(|| String::new());
    let description = use_state(|| String::new());
    let price = use_state(|| String::new());
    let category = use_state(|| String::new());
    let post_type = use_state(|| "sell".to_string());
    let condition = use_state(|| "New".to_string());
    let author = use_state(|| String::new());
    let images = use_state(|| Vec::<String>::new());
    let videos = use_state(|| Vec::<String>::new());
    let loading = use_state(|| false);
    let error = use_state(|| None::<String>);
    let success = use_state(|| false);

    let navigator = use_navigator().unwrap();

    let on_submit = {
        let title = title.clone();
        let description = description.clone();
        let price = price.clone();
        let category = category.clone();
        let post_type = post_type.clone();
        let condition = condition.clone();
        let author = author.clone();
        let images = images.clone();
        let videos = videos.clone();
        let loading = loading.clone();
        let error = error.clone();
        let success = success.clone();
        let navigator = navigator.clone();

        Callback::from(move |e: SubmitEvent| {
            e.prevent_default();
            
            if title.is_empty() || description.is_empty() || price.is_empty() || 
               category.is_empty() || condition.is_empty() || author.is_empty() {
                error.set(Some("All fields are required".to_string()));
                return;
            }

            let price_value = match price.parse::<f64>() {
                Ok(p) => p,
                Err(_) => {
                    error.set(Some("Invalid price format".to_string()));
                    return;
                }
            };

            loading.set(true);
            error.set(None);

            let api = ApiService::new();
            let post = CreatePostRequest {
                title: title.to_string(),
                description: description.to_string(),
                price: price_value,
                category: category.to_string(),
                post_type: post_type.to_string(),
                condition: condition.to_string(),
                author: author.to_string(),
                images: images.to_vec(),
                videos: videos.to_vec(),
            };

            let callback = {
                let loading = loading.clone();
                let error = error.clone();
                let success = success.clone();
                let navigator = navigator.clone();
                Callback::from(move |result: Result<Post, String>| {
                    loading.set(false);
                    match result {
                        Ok(_) => {
                            success.set(true);
                            navigator.push(&Route::Home);
                        }
                        Err(e) => {
                            error.set(Some(e));
                        }
                    }
                })
            };

            api.create_post(post, callback);
        })
    };

    let on_image_upload = {
        let images = images.clone();
        let error = error.clone();
        Callback::from(move |e: Event| {
            if let Some(input) = e.target_dyn_into::<HtmlInputElement>() {
                if let Some(files) = input.files() {
                    if let Some(file) = files.get(0) {
                        let form_data = FormData::new().unwrap();
                        form_data.append_with_blob("image", &file).unwrap();
                        
                        let images_clone = images.clone();
                        let error_clone = error.clone();
                        
                        spawn_local(async move {
                            let client = reqwest::Client::new();
                            
                            // Convert FormData to reqwest::multipart::Form
                            let mut form = reqwest::multipart::Form::new();
                            
                            // Read file as bytes
                            let file_array = wasm_bindgen_futures::JsFuture::from(file.array_buffer())
                                .await
                                .unwrap();
                            let file_bytes = js_sys::Uint8Array::new(&file_array).to_vec();
                            
                            let part = reqwest::multipart::Part::bytes(file_bytes)
                                .file_name(file.name())
                                .mime_str(file.type_().as_str())
                                .unwrap();
                            
                            form = form.part("image", part);
                            
                            match client
                                .post("http://localhost:8080/api/upload/image")
                                .multipart(form)
                                .send()
                                .await
                            {
                                Ok(response) => {
                                    if response.status().is_success() {
                                        match response.json::<serde_json::Value>().await {
                                            Ok(json) => {
                                                if let Some(url) = json.get("url").and_then(|v| v.as_str()) {
                                                    let mut current_images = images_clone.to_vec();
                                                    current_images.push(url.to_string());
                                                    images_clone.set(current_images);
                                                }
                                            }
                                            Err(e) => error_clone.set(Some(format!("Failed to parse upload response: {}", e))),
                                        }
                                    } else {
                                        error_clone.set(Some(format!("Failed to upload image: {}", response.status())));
                                    }
                                }
                                Err(e) => error_clone.set(Some(format!("Upload failed: {}", e))),
                            }
                        });
                    }
                }
            }
        })
    };

    let on_video_upload = {
        let videos = videos.clone();
        let error = error.clone();
        Callback::from(move |e: Event| {
            if let Some(input) = e.target_dyn_into::<HtmlInputElement>() {
                if let Some(files) = input.files() {
                    if let Some(file) = files.get(0) {
                        let videos_clone = videos.clone();
                        let error_clone = error.clone();
                        
                        spawn_local(async move {
                            let client = reqwest::Client::new();
                            
                            // Read file as bytes
                            let file_array = wasm_bindgen_futures::JsFuture::from(file.array_buffer())
                                .await
                                .unwrap();
                            let file_bytes = js_sys::Uint8Array::new(&file_array).to_vec();
                            
                            let part = reqwest::multipart::Part::bytes(file_bytes)
                                .file_name(file.name())
                                .mime_str(file.type_().as_str())
                                .unwrap();
                            
                            let form = reqwest::multipart::Form::new().part("video", part);
                            
                            match client
                                .post("http://localhost:8080/api/upload/video")
                                .multipart(form)
                                .send()
                                .await
                            {
                                Ok(response) => {
                                    if response.status().is_success() {
                                        match response.json::<serde_json::Value>().await {
                                            Ok(json) => {
                                                if let Some(url) = json.get("url").and_then(|v| v.as_str()) {
                                                    let mut current_videos = videos_clone.to_vec();
                                                    current_videos.push(url.to_string());
                                                    videos_clone.set(current_videos);
                                                }
                                            }
                                            Err(e) => error_clone.set(Some(format!("Failed to parse upload response: {}", e))),
                                        }
                                    } else {
                                        error_clone.set(Some(format!("Failed to upload video: {}", response.status())));
                                    }
                                }
                                Err(e) => error_clone.set(Some(format!("Upload failed: {}", e))),
                            }
                        });
                    }
                }
            }
        })
    };

    html! {
        <div class="create-post">
            <div class="container">
                <h2>{ "Create New Post" }</h2>
                
                <form onsubmit={on_submit}>
                    <div class="form-group">
                        <label for="title">{ "Title" }</label>
                        <input
                            type="text"
                            id="title"
                            value={(*title).clone()}
                            oninput={Callback::from(move |e: InputEvent| {
                                if let Some(input) = e.target_dyn_into::<HtmlInputElement>() {
                                    title.set(input.value());
                                }
                            })}
                            required=true
                        />
                    </div>

                    <div class="form-group">
                        <label for="description">{ "Description" }</label>
                        <textarea
                            id="description"
                            value={(*description).clone()}
                            oninput={Callback::from(move |e: InputEvent| {
                                if let Some(input) = e.target_dyn_into::<web_sys::HtmlTextAreaElement>() {
                                    description.set(input.value());
                                }
                            })}
                            required=true
                        />
                    </div>

                    <div class="form-group">
                        <label for="price">{ "Price" }</label>
                        <input
                            type="number"
                            id="price"
                            step="0.01"
                            value={(*price).clone()}
                            oninput={Callback::from(move |e: InputEvent| {
                                if let Some(input) = e.target_dyn_into::<HtmlInputElement>() {
                                    price.set(input.value());
                                }
                            })}
                            required=true
                        />
                    </div>

                    <div class="form-group">
                        <label for="category">{ "Category" }</label>
                        <select
                            id="category"
                            value={(*category).clone()}
                            onchange={Callback::from(move |e: Event| {
                                if let Some(select) = e.target_dyn_into::<web_sys::HtmlSelectElement>() {
                                    category.set(select.value());
                                }
                            })}
                            required=true
                        >
                            <option value="">{ "Select a category" }</option>
                            <option value="textbooks">{ "Textbooks" }</option>
                            <option value="electronics">{ "Electronics" }</option>
                            <option value="furniture">{ "Furniture" }</option>
                            <option value="clothing">{ "Clothing" }</option>
                            <option value="other">{ "Other" }</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>{ "Type" }</label>
                        <div class="radio-group">
                            <label>
                                <input
                                    type="radio"
                                    name="post_type"
                                    value="sell"
                                    checked={*post_type == "sell"}
                                    onchange={Callback::from({
                                        let post_type = post_type.clone();
                                        move |e: Event| {
                                            if let Some(input) = e.target_dyn_into::<HtmlInputElement>() {
                                                if input.checked() {
                                                    post_type.set("sell".to_string());
                                                }
                                            }
                                        }
                                    })}
                                />
                                { "Selling" }
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="post_type"
                                    value="buy"
                                    checked={*post_type == "buy"}
                                    onchange={Callback::from({
                                        let post_type = post_type.clone();
                                        move |e: Event| {
                                            if let Some(input) = e.target_dyn_into::<HtmlInputElement>() {
                                                if input.checked() {
                                                    post_type.set("buy".to_string());
                                                }
                                            }
                                        }
                                    })}
                                />
                                { "Buying" }
                            </label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="condition">{ "Condition" }</label>
                        <select
                            id="condition"
                            value={(*condition).clone()}
                            onchange={Callback::from(move |e: Event| {
                                if let Some(select) = e.target_dyn_into::<web_sys::HtmlSelectElement>() {
                                    condition.set(select.value());
                                }
                            })}
                            required=true
                        >
                            <option value="New">{ "New" }</option>
                            <option value="Used - Like New">{ "Used - Like New" }</option>
                            <option value="Used - Good">{ "Used - Good" }</option>
                            <option value="Used - Fair">{ "Used - Fair" }</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>{ "Images" }</label>
                        <input
                            type="file"
                            accept="image/*"
                            onchange={on_image_upload}
                        />
                        if !images.is_empty() {
                            <div class="uploaded-files">
                                { for images.iter().map(|url| {
                                    html! {
                                        <div class="uploaded-file">
                                            <img src={format!("http://localhost:8080{}", url)} alt="Uploaded image" style="max-width: 100px; max-height: 100px;" />
                                            <span>{ url }</span>
                                        </div>
                                    }
                                }) }
                            </div>
                        }
                    </div>

                    <div class="form-group">
                        <label>{ "Videos" }</label>
                        <input
                            type="file"
                            accept="video/*"
                            onchange={on_video_upload}
                        />
                        if !videos.is_empty() {
                            <div class="uploaded-files">
                                { for videos.iter().map(|url| {
                                    html! {
                                        <div class="uploaded-file">
                                            <video src={format!("http://localhost:8080{}", url)} controls=true style="max-width: 200px; max-height: 150px;" />
                                            <span>{ url }</span>
                                        </div>
                                    }
                                }) }
                            </div>
                        }
                    </div>

                    <div class="form-group">
                        <label for="author">{ "Your Name" }</label>
                        <input
                            type="text"
                            id="author"
                            value={(*author).clone()}
                            oninput={Callback::from(move |e: InputEvent| {
                                if let Some(input) = e.target_dyn_into::<HtmlInputElement>() {
                                    author.set(input.value());
                                }
                            })}
                            required=true
                        />
                    </div>

                    if let Some(err) = (*error).as_ref() {
                        <div class="error">{ err }</div>
                    }

                    if *success {
                        <div class="success">{ "Post created successfully!" }</div>
                    }

                    <button type="submit" disabled={*loading}>
                        { if *loading { "Creating..." } else { "Create Post" } }
                    </button>
                </form>
            </div>
        </div>
    }
}