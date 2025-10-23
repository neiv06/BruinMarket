use yew::prelude::*;
use yew_router::prelude::*;
use crate::Route;

#[function_component(Header)]
pub fn header() -> Html {
    html! {
        <header class="header">
            <div class="container">
                <div class="header-content">
                    <h1 class="logo">
                        <Link<Route> to={Route::Home}>
                            { "BruinBuy" }
                        </Link<Route>>
                    </h1>
                    <nav class="nav">
                        <Link<Route> to={Route::Home} classes="nav-link">
                            { "Home" }
                        </Link<Route>>
                        <Link<Route> to={Route::CreatePost} classes="nav-link">
                            { "Create Post" }
                        </Link<Route>>
                    </nav>
                </div>
            </div>
        </header>
    }
}

#[function_component(Footer)]
pub fn footer() -> Html {
    html! {
        <footer class="footer">
            <div class="container">
                <p>{ "© 2024 BruinBuy - UCLA Student Marketplace" }</p>
            </div>
        </footer>
    }
}
