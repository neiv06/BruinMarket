use yew::prelude::*;
use yew_router::prelude::*;
use crate::models::{Post, CreatePostRequest};
use crate::services::ApiService;
use crate::Route;
use web_sys::{FormData, HtmlInputElement};
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::spawn_local;

// Helper function to get full image URL
fn get_full_url(path: &str) -> String {
    if path.starts_with("http") {
        path.to_string()
    } else {
        format!("http://localhost:8080{}", path)
    }
}

#[function_component(Home)]
pub fn home() -> Html {
    let posts = use_state(|| Vec::<Post>::new());
    let loading = use_state(|| true);
    let error = use_state(|| None::<String>);

    {
        let posts = posts.clone();
        let loading = loading.clone();
        let error = error.clone();
        
        use_effect_with((), move |_| {
            let api = ApiService::new();
            let callback = Callback::from(move |result: Result<Vec<Post>, String>| {
                loading.set(false);
                match result {
                    Ok(fetched_posts) => posts.set(fetched_posts),
                    Err(e) => error.set(Some(e)),
                }
            });
            api.get_posts(callback);
            || ()
        });
    }

    html! {
        <div class="home">
            <div class="container">
                <h2>{ "Marketplace Posts" }</h2>
                
                if *loading {
                    <div class="loading">{ "Loading posts..." }</div>
                } else if let Some(err) = (*error).as_ref() {
                    <div class="error">{ format!("Error: {}", err) }</div>
                } else if posts.is_empty() {
                    <div class="no-posts">{ "No posts yet. Be the first to create one!" }</div>
                } else {
                    <div class="posts-grid">
                        { for posts.iter().map(|post| {
                            html! {
                                <div class="post-card">
                                    <Link<Route> to={Route::PostDetail { id: post.id.to_string() }}>
                                        if !post.images.is_empty() {
                                            <div class="post-image">
                                                <img 
                                                    src={get_full_url(&post.images[0])} 
                                                    alt={post.title.clone()}
                                                    onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22%3ENo Image%3C/text%3E%3C/svg%3E'"
                                                />
                                            </div>
                                        } else {
                                            <div class="post-image no-image">
                                                <span>{ "No Image" }</span>
                                            </div>
                                        }
                                        <div class="post-info">
                                            <h3>{ &post.title }</h3>
                                            <p class="post-price">{ format!("${:.2}", post.price) }</p>
                                            <p class="post-meta">
                                                { format!("{} • {}", post.category, post.condition) }
                                            </p>
                                            <span class={classes!("post-type", if post.post_type == "buy" { "buy" } else { "sell" })}>
                                                { if post.post_type == "buy" { "BUYING" } else { "SELLING" } }
                                            </span>
                                        </div>
                                    </Link<Route>>
                                </div>
                            }
                        }) }
                    </div>
                }
            </div>
        </div>
    }
}

#[derive(Properties, PartialEq)]
pub struct PostDetailProps {
    pub id: String,
}

#[function_component(PostDetail)]
pub fn post_detail(props: &PostDetailProps) -> Html {
    let post = use_state(|| None::<Post>);
    let loading = use_state(|| true);
    let error = use_state(|| None::<String>);

    {
        let post = post.clone();
        let loading = loading.clone();
        let error = error.clone();
        let id = props.id.clone();
        
        use_effect_with(id.clone(), move |_| {
            let api = ApiService::new();
            let post_id = id.parse::<i32>().unwrap_or(0);
            let callback = Callback::from(move |result: Result<Post, String>| {
                loading.set(false);
                match result {
                    Ok(fetched_post) => post.set(Some(fetched_post)),
                    Err(e) => error.set(Some(e)),
                }
            });
            api.get_post(post_id, callback);
            || ()
        });
    }

    html! {
        <div class="post-detail">
            <div class="container">
                if *loading {
                    <div class="loading">{ "Loading post..." }</div>
                } else if let Some(err) = (*error).as_ref() {
                    <div class="error">{ format!("Error: {}", err) }</div>
                } else if let Some(p) = (*post).as_ref() {
                    <div class="post-content">
                        <h2>{ &p.title }</h2>
                        
                        // Image gallery
                        if !p.images.is_empty() {
                            <div class="media-gallery">
                                { for p.images.iter().map(|img| {
                                    html! {
                                        <div class="media-item">
                                            <img 
                                                src={get_full_url(img)} 
                                                alt={p.title.clone()}
                                                onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                                            />
                                            <div style="display:none; padding: 20px; background: #f0f0f0; text-align: center;">
                                                { "Image failed to load" }
                                            </div>
                                        </div>
                                    }
                                }) }
                            </div>
                        }
                        
                        // Video gallery
                        if !p.videos.is_empty() {
                            <div class="media-gallery">
                                { for p.videos.iter().map(|vid| {
                                    html! {
                                        <div class="media-item">
                                            <video 
                                                src={get_full_url(vid)} 
                                                controls=true
                                                onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                                            />
                                            <div style="display:none; padding: 20px; background: #f0f0f0; text-align: center;">
                                                { "Video failed to load" }
                                            </div>
                                        </div>
                                    }
                                }) }
                            </div>
                        }
                        
                        <div class="post-details">
                            <p class="price">{ format!("${:.2}", p.price) }</p>
                            <p class="description">{ &p.description }</p>
                            
                            <div class="post-meta-info">
                                <p><strong>{ "Category: " }</strong>{ &p.category }</p>
                                <p><strong>{ "Condition: " }</strong>{ &p.condition }</p>
                                <p><strong>{ "Type: " }</strong>{ &p.post_type }</p>
                                <p><strong>{ "Posted by: " }</strong>{ &p.author }</p>
                            </div>
                        </div>
                    </div>
                } else {
                    <div class="error">{ "Post not found" }</div>
                }
            </div>
        </div>
    }
}

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
    let uploading = use_state(|| false);

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
        let uploading = uploading.clone();
        
        Callback::from(move |e: Event| {
            web_sys::console::log_1(&"IMAGE UPLOAD CLICKED!".into());
            let images = images.clone();
            let error = error.clone();
            let uploading = uploading.clone();
            
            if let Some(input) = e.target_dyn_into::<HtmlInputElement>() {
                if let Some(files) = input.files() {
                    if let Some(file) = files.get(0) {
                        uploading.set(true);
                        
                        let file_name = file.name();
                        let file_type = file.type_();
                        
                        // Read file as bytes using FileReader
                        spawn_local(async move {
                            // Convert web_sys::File to bytes
                            let array_buffer = wasm_bindgen_futures::JsFuture::from(
                                file.array_buffer()
                            ).await;
                            
                            match array_buffer {
                                Ok(buffer) => {
                                    let uint8_array = js_sys::Uint8Array::new(&buffer);
                                    let bytes = uint8_array.to_vec();
                                    
                                    // Create multipart form
                                    let part = reqwest::multipart::Part::bytes(bytes)
                                        .file_name(file_name.clone())
                                        .mime_str(&file_type)
                                        .unwrap();
                                    
                                    let form = reqwest::multipart::Form::new()
                                        .part("image", part);
                                    
                                    // Upload to server
                                    let client = reqwest::Client::new();
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
                                                            let mut current = (*images).clone();
                                                            current.push(url.to_string());
                                                            images.set(current);
                                                            web_sys::console::log_1(&format!("Image uploaded: {}", url).into());
                                                        }
                                                    }
                                                    Err(e) => {
                                                        error.set(Some(format!("Parse error: {}", e)));
                                                    }
                                                }
                                            } else {
                                                let status = response.status();
                                                let text = response.text().await.unwrap_or_default();
                                                error.set(Some(format!("Upload failed: {} - {}", status, text)));
                                            }
                                        }
                                        Err(e) => {
                                            error.set(Some(format!("Network error: {}", e)));
                                        }
                                    }
                                    uploading.set(false);
                                }
                                Err(e) => {
                                    error.set(Some(format!("File read error: {:?}", e)));
                                    uploading.set(false);
                                }
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
        let uploading = uploading.clone();
        
        Callback::from(move |e: Event| {
            let videos = videos.clone();
            let error = error.clone();
            let uploading = uploading.clone();
            
            if let Some(input) = e.target_dyn_into::<HtmlInputElement>() {
                if let Some(files) = input.files() {
                    if let Some(file) = files.get(0) {
                        uploading.set(true);
                        
                        let file_name = file.name();
                        let file_type = file.type_();
                        
                        spawn_local(async move {
                            let array_buffer = wasm_bindgen_futures::JsFuture::from(
                                file.array_buffer()
                            ).await;
                            
                            match array_buffer {
                                Ok(buffer) => {
                                    let uint8_array = js_sys::Uint8Array::new(&buffer);
                                    let bytes = uint8_array.to_vec();
                                    
                                    let part = reqwest::multipart::Part::bytes(bytes)
                                        .file_name(file_name.clone())
                                        .mime_str(&file_type)
                                        .unwrap();
                                    
                                    let form = reqwest::multipart::Form::new()
                                        .part("video", part);
                                    
                                    let client = reqwest::Client::new();
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
                                                            let mut current = (*videos).clone();
                                                            current.push(url.to_string());
                                                            videos.set(current);
                                                            web_sys::console::log_1(&format!("Video uploaded: {}", url).into());
                                                        }
                                                    }
                                                    Err(e) => {
                                                        error.set(Some(format!("Parse error: {}", e)));
                                                    }
                                                }
                                            } else {
                                                let status = response.status();
                                                let text = response.text().await.unwrap_or_default();
                                                error.set(Some(format!("Upload failed: {} - {}", status, text)));
                                            }
                                        }
                                        Err(e) => {
                                            error.set(Some(format!("Network error: {}", e)));
                                        }
                                    }
                                    uploading.set(false);
                                }
                                Err(e) => {
                                    error.set(Some(format!("File read error: {:?}", e)));
                                    uploading.set(false);
                                }
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
                        <label for="price">{ "Price ($)" }</label>
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
                                { " Selling" }
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
                                { " Buying" }
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
                            disabled={*uploading}
                        />
                        if *uploading {
                            <div class="upload-status">{ "Uploading..." }</div>
                        }
                        if !images.is_empty() {
                            <div class="uploaded-files">
                                { for images.iter().map(|url| {
                                    html! {
                                        <div class="uploaded-file">
                                            <img 
                                                src={get_full_url(url)} 
                                                alt="Uploaded" 
                                                style="max-width: 150px; max-height: 150px; object-fit: cover; border-radius: 4px;"
                                                onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f44%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2212%22%3EError%3C/text%3E%3C/svg%3E'"
                                            />
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
                            disabled={*uploading}
                        />
                        if *uploading {
                            <div class="upload-status">{ "Uploading..." }</div>
                        }
                        if !videos.is_empty() {
                            <div class="uploaded-files">
                                { for videos.iter().map(|url| {
                                    html! {
                                        <div class="uploaded-file">
                                            <video 
                                                src={get_full_url(url)} 
                                                controls=true 
                                                style="max-width: 200px; max-height: 150px; border-radius: 4px;"
                                            />
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
                        <div class="error" style="color: red; padding: 10px; margin: 10px 0; background: #fee;">
                            { err }
                        </div>
                    }

                    if *success {
                        <div class="success" style="color: green; padding: 10px; margin: 10px 0; background: #efe;">
                            { "Post created successfully!" }
                        </div>
                    }

                    <button type="submit" disabled={*loading || *uploading}>
                        { if *loading { "Creating..." } else if *uploading { "Uploading files..." } else { "Create Post" } }
                    </button>
                </form>
            </div>
        </div>
    }
}