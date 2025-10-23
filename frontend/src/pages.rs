use yew::prelude::*;
use yew_router::prelude::*;
use crate::models::{Post, CreatePostRequest};
use crate::services::ApiService;
use crate::Route;

#[function_component(CreatePost)]
pub fn create_post() -> Html {
    let title = use_state(|| String::new());
    let description = use_state(|| String::new());
    let price = use_state(|| String::new());
    let category = use_state(|| String::new());
    let post_type = use_state(|| "sell".to_string());
    let author = use_state(|| String::new());
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
        let author = author.clone();
        let loading = loading.clone();
        let error = error.clone();
        let success = success.clone();
        let navigator = navigator.clone();

        Callback::from(move |e: SubmitEvent| {
            e.prevent_default();
            
            if title.is_empty() || description.is_empty() || price.is_empty() || 
               category.is_empty() || author.is_empty() {
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
                author: author.to_string(),
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
                                if let Some(input) = e.target_dyn_into::<web_sys::HtmlInputElement>() {
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
                                if let Some(input) = e.target_dyn_into::<web_sys::HtmlInputElement>() {
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
                                            if let Some(input) = e.target_dyn_into::<web_sys::HtmlInputElement>() {
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
                                            if let Some(input) = e.target_dyn_into::<web_sys::HtmlInputElement>() {
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
                        <label for="author">{ "Your Name" }</label>
                        <input
                            type="text"
                            id="author"
                            value={(*author).clone()}
                            oninput={Callback::from(move |e: InputEvent| {
                                if let Some(input) = e.target_dyn_into::<web_sys::HtmlInputElement>() {
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
        
        use_effect_with(props.id.clone(), move |id| {
            let api = ApiService::new();
            let post_callback = {
                let post = post.clone();
                let loading = loading.clone();
                let error = error.clone();
                Callback::from(move |result: Result<Post, String>| {
                    loading.set(false);
                    match result {
                        Ok(fetched_post) => {
                            post.set(Some(fetched_post));
                            error.set(None);
                        }
                        Err(e) => {
                            error.set(Some(e));
                        }
                    }
                })
            };
            
            if let Ok(post_id) = id.parse::<i32>() {
                api.get_post(post_id, post_callback);
            } else {
                error.set(Some("Invalid post ID".to_string()));
                loading.set(false);
            }
        });
    }

    html! {
        <div class="post-detail">
            <div class="container">
                if *loading {
                    <div class="loading">{ "Loading post..." }</div>
                } else if let Some(err) = (*error).as_ref() {
                    <div class="error">{ format!("Error: {}", err) }</div>
                } else if let Some(post) = (*post).as_ref() {
                    <div class="post-detail-content">
                        <h1>{ &post.title }</h1>
                        <div class="post-meta">
                            <span class="price">{ format!("${:.2}", post.price) }</span>
                            <span class="category">{ &post.category }</span>
                            <span class="post-type">{ &post.post_type }</span>
                        </div>
                        <p class="post-description">{ &post.description }</p>
                        <p class="author">{ format!("Posted by: {}", post.author) }</p>
                        <p class="date">{ format!("Created: {}", post.created_at) }</p>
                    </div>
                }
            </div>
        </div>
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
            let callback = {
                let posts = posts.clone();
                let loading = loading.clone();
                let error = error.clone();
                Callback::from(move |result: Result<Vec<Post>, String>| {
                    loading.set(false);
                    match result {
                        Ok(fetched_posts) => {
                            posts.set(fetched_posts);
                            error.set(None);
                        }
                        Err(e) => {
                            error.set(Some(e));
                        }
                    }
                })
            };
            
            api.get_posts(callback);
            || ()
        });
    }

    html! {
        <div class="home">
            <div class="container">
                <h2>{ "UCLA Student Marketplace" }</h2>
                
                if *loading {
                    <div class="loading">{ "Loading posts..." }</div>
                } else if let Some(err) = (*error).as_ref() {
                    <div class="error">{ format!("Error: {}", err) }</div>
                } else if posts.is_empty() {
                    <div class="empty">{ "No posts yet. Be the first to create one!" }</div>
                } else {
                    <div class="posts-grid">
                        { for posts.iter().map(|post| {
                            html! {
                                <Link<Route> to={Route::PostDetail { id: post.id.to_string() }}>
                                    <div class="post-card">
                                        <h3>{ &post.title }</h3>
                                        <p class="post-description">{ &post.description }</p>
                                        <div class="post-meta">
                                            <span class="price">{ format!("${:.2}", post.price) }</span>
                                            <span class="category">{ &post.category }</span>
                                            <span class="post-type">{ &post.post_type }</span>
                                        </div>
                                        <p class="author">{ format!("by {}", post.author) }</p>
                                    </div>
                                </Link<Route>>
                            }
                        }) }
                    </div>
                }
            </div>
        </div>
    }
}