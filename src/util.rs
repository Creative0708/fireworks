use std::cell::RefCell;

use tinyrand::{Rand, RandRange};

use crate::renderer::Color;

use crate::math::Vec2;

thread_local! {
static RAND: RefCell<Option<tinyrand::StdRand>> = const { RefCell::new(None) };
}

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn seed_rand(seed: u64) {
    if RAND.with_borrow(Option::is_some) {
        panic!("seed_rand called multiple times");
    }
    use tinyrand::Seeded;
    RAND.set(Some(tinyrand::StdRand::seed(seed)));
}

pub fn with_rand<F, R>(f: F) -> R
where
    F: FnOnce(&mut tinyrand::StdRand) -> R,
{
    RAND.with_borrow_mut(|val| f(val.as_mut().expect("with_rand called before seed_rand")))
}

pub fn fuzzy(center: f32, val: f32) -> f32 {
    if val <= 0.0 {
        return center;
    }
    center + rand_range(-val, val)
}
pub fn fuzzy_circle(outer: f32) -> Vec2 {
    let angle = rand_range(0.0, std::f32::consts::TAU);
    let mag = rand_range(outer, 1.0_f32).powi(2);

    Vec2::new(angle.cos(), angle.sin()) * mag
}
pub fn id() -> u64 {
    with_rand(|rand| rand.next_u64())
}
pub fn choice<T: Clone>(choices: &[T]) -> T {
    choices[with_rand(|rand| rand.next_range(0..choices.len()))].clone()
}
pub fn probability(prob: f32) -> bool {
    if prob >= 1.0 {
        return true;
    }
    if prob <= 0.0 {
        return false;
    }
    with_rand(|rand| rand.next_bool(tinyrand::Probability::new(prob as _)))
}
pub fn rand01() -> f32 {
    with_rand(|rand| rand.next_u32() as f32 / (u32::MAX as f32))
}
pub fn rand_range(min: f32, max: f32) -> f32 {
    if min >= max {
        return min;
    }
    rand01() * (max - min) + min
}

pub fn darken_color(color: Color) -> Color {
    match color {
        Color::Red => Color::DarkRed,
        Color::Green => Color::DarkGreen,
        Color::Yellow => Color::DarkYellow,
        Color::Blue => Color::DarkBlue,
        Color::Magenta => Color::DarkMagenta,
        Color::Cyan => Color::DarkCyan,
        Color::White => Color::DarkGrey,
        Color::Grey => Color::DarkGrey,
        other => other,
    }
}
pub fn darken_colors(colors: &[Color]) -> Vec<Color> {
    colors
        .iter()
        .map(|color| darken_color(color.clone()))
        .collect()
}

// used for "pause" menu
pub fn desaturate_color(color: Color) -> Color {
    match color {
        Color::Transparent => Color::Transparent,
        _ => Color::DarkGrey,
    }
}

// https://stackoverflow.com/questions/5531827/random-point-on-a-given-sphere
pub fn rand_on_sphere() -> [f32; 3] {
    let theta = self::rand_range(0.0, std::f32::consts::TAU);
    let phi = self::rand_range(-1.0, 1.0).acos();
    return [phi.sin() * theta.cos(), phi.sin() * theta.sin(), phi.cos()];
}
