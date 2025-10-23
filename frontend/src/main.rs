use yew::prelude::*;
use yew_router::prelude::*;

mod components;
mod pages;
mod services;
mod models;

use components::{Header, Footer};
use pages::{Home, CreatePost, PostDetail};

#[derive(Clone, Routable, PartialEq)]
enum Route {
    #[at("/")]
    Home,
    #[at("/create")]
    CreatePost,
    #[at("/post/:id")]
    PostDetail { id: String },
}

fn switch(routes: Route) -> Html {
    match routes {
        Route::Home => html! { <Home /> },
        Route::CreatePost => html! { <CreatePost /> },
        Route::PostDetail { id } => html! { <PostDetail id={id} /> },
    }
}

#[function_component(App)]
fn app() -> Html {
    html! {
        <BrowserRouter>
            <div class="app">
                <Header />
                <main class="main-content">
                    <Switch<Route> render={switch} />
                </main>
                <Footer />
            </div>
        </BrowserRouter>
    }
}

fn main() {
    yew::Renderer::<App>::new().render();
}
