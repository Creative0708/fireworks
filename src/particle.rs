use crossterm::style::Color;

use crate::math::{self, Vec2};

#[derive(Debug)]
pub struct Particle {
    pos: Vec2,
    vel: Vec2,

    radius: f32,
    starting_radius: f32,
    density: f32,

    background_color_set_radius: f32,

    decay: f32,

    color: Color,

    force_this_frame: Vec2,

    gradient: &'static [u8],
}

impl Particle {
    pub fn new(
        pos: Vec2,
        vel: Vec2,
        radius: f32,
        density: f32,
        background_color_set_radius: f32,
        decay: f32,
        color: Color,
        gradient: &'static [u8],
    ) -> Self {
        Self {
            pos,
            vel,

            radius,
            starting_radius: radius,
            density,

            background_color_set_radius,

            decay,

            color,

            force_this_frame: Vec2::ZERO,

            gradient,
        }
    }

    pub fn update(&mut self, delta: f32) -> bool {
        // gravity
        const GRAVITY: f32 = 15.0;
        self.vel.y += GRAVITY * delta;

        // drag
        let mag_sqr = self.vel.mag_sqr();
        if mag_sqr != 0.0 {
            let drag_fac = math::sigmoid(self.density);
            self.vel *= drag_fac.powf(delta);
        }

        // misc forces
        if self.force_this_frame != Vec2::ZERO {
            self.vel += self.force_this_frame * delta;
            self.force_this_frame = Vec2::ZERO;
        }

        self.pos += self.vel * delta;

        self.radius -= self.decay * delta;

        self.radius >= 0.0
    }

    pub fn apply_continuous_force(&mut self, force: Vec2) {
        self.force_this_frame += force;
    }

    // boilerplate...
    pub fn pos(&self) -> Vec2 {
        self.pos
    }
    pub fn vel(&self) -> Vec2 {
        self.vel
    }
    pub fn radius(&self) -> f32 {
        self.radius
    }
    pub fn decay(&self) -> f32 {
        self.decay
    }
    pub fn color(&self) -> Color {
        self.color
    }
    pub fn gradient(&self) -> &'static [u8] {
        self.gradient
    }

    pub fn render_with_colors(
        &self,
        renderer: &mut crate::renderer::Renderer,
        bg_override: Option<Color>,
        fg_override: Option<Color>,
    ) {
        let is_highlighted = self.background_color_set_radius != 0.0
            && self.radius > self.background_color_set_radius;
        let bg = bg_override.or(is_highlighted.then(|| crate::util::darken_color(self.color)));
        let fg = fg_override.unwrap_or_else(|| {
            if is_highlighted {
                Color::White
            } else if self.radius > self.decay {
                self.color
            } else {
                crate::util::darken_color(self.color)
            }
        });
        renderer.add_if_in_bounds(
            self.pos,
            crate::renderer::Cell {
                bg,
                fg,
                ch: {
                    self.gradient[((self.radius / self.starting_radius * 8.0) as usize)
                        .clamp(0, self.gradient.len() - 1)] as char
                },
            },
        );
    }
}

impl crate::renderer::Renderable for Particle {
    fn render(&self, renderer: &mut crate::renderer::Renderer) {
        self.render_with_colors(renderer, None, None);
    }
}
