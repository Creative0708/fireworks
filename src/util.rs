use crossterm::style::Color;
use rand::{Rng, RngCore};

use crate::math::Vec2;

/// Returns a random value between `-val` and `val`.
pub fn fuzzy(center: f32, val: f32) -> f32 {
    if val <= 0.0 {
        return center;
    }
    rand::thread_rng().gen_range(center - val..center + val)
}
pub fn fuzzy_circle(outer: f32) -> Vec2 {
    let mut rng = rand::thread_rng();
    let angle = rng.gen_range(0.0..std::f32::consts::TAU);
    let mag = rng.gen_range(outer..1.0_f32).powi(2);

    Vec2::new(angle.cos(), angle.sin()) * mag
}
pub fn id() -> u64 {
    rand::thread_rng().next_u64()
}
pub fn choice<T: Clone>(choices: &[T]) -> T {
    use rand::seq::SliceRandom;
    choices.choose(&mut rand::thread_rng()).unwrap().clone()
}
pub fn probability(prob: f32) -> bool {
    rand::thread_rng().gen_bool(prob as f64)
}
pub fn rand_range(min: f32, max: f32) -> f32 {
    let range = min..=max;
    if range.is_empty() {
        return min;
    }
    rand::thread_rng().gen_range(range)
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

// used for "pause" menu
pub fn desaturate_color(color: Color) -> Color {
    match color {
        Color::Reset | Color::Black => Color::Reset,
        _ => Color::DarkGrey,
    }
}

// https://stackoverflow.com/questions/5531827/random-point-on-a-given-sphere
pub fn rand_on_sphere() -> [f32; 3] {
    let theta = self::rand_range(0.0, std::f32::consts::TAU);
    let phi = self::rand_range(-1.0, 1.0).acos();
    return [phi.sin() * theta.cos(), phi.sin() * theta.sin(), phi.cos()];
}
