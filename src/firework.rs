use crossterm::style::Color;

use crate::{particle::Particle, util, world};

#[derive(Debug)]
pub struct Firework {
    particle: Particle,

    lifetime: f32,
    max_lifetime: f32,

    firework_type: FireworkType,
    trail_type: TrailType,
    colors: Vec<Color>,
}

impl Firework {
    pub fn new(
        particle: Particle,
        lifetime: f32,
        firework_type: FireworkType,
        trail_type: TrailType,
        colors: Vec<Color>,
    ) -> Self {
        Self {
            particle,
            lifetime,
            max_lifetime: lifetime,
            firework_type,
            trail_type,
            colors,
        }
    }

    pub fn update(&mut self, delta: f32, world: &mut world::World) -> bool {
        self.particle.update(delta);
        self.lifetime -= delta;
        if self.particle.vel().y > 0.0 {
            self.lifetime -= delta;
        }

        match self.trail_type {
            TrailType::None => (),
            TrailType::Basic {
                lifetime,
                spread,
                color,
            } => world.add_particle(Particle::new(
                self.particle.pos(),
                util::fuzzy_circle(0.0) * spread,
                0.03,
                0.0001,
                0.03 / util::rand_range(0.01, lifetime),
                color,
                b".-.-*+*+",
            )),
        }

        match self.firework_type {
            FireworkType::Standard { .. } => {
                self.particle.apply_continuous_force(
                    self.particle.vel().normalize()
                        * ((self.lifetime / self.max_lifetime).powf(0.3) * 50.0),
                );
            }
        }

        if self.lifetime <= 0.0 {
            match self.firework_type {
                FireworkType::Standard {
                    num_particles,
                    radius,
                    particle_radius,
                    particle_lifespan,
                } => {
                    for _ in 0..num_particles {
                        world.add_particle(Particle::new(
                            self.particle.pos(),
                            {
                                let mut val = util::fuzzy_circle(0.1) * radius;
                                // assume a 1:2 ratio for terminal chars
                                val.x *= 2.0;
                                val
                            },
                            util::fuzzy(particle_radius, 0.1),
                            util::fuzzy(0.03, 0.001),
                            particle_radius / util::fuzzy(particle_lifespan, 0.5),
                            util::choice(&self.colors),
                            b".,:;*&@",
                        ));
                    }
                }
            }
            false
        } else {
            true
        }
    }
}

#[derive(Debug)]
pub enum FireworkType {
    Standard {
        num_particles: u32,
        radius: f32,
        particle_radius: f32,
        particle_lifespan: f32,
    },
}

impl crate::renderer::Renderable for Firework {
    fn render(&self, renderer: &mut crate::renderer::Renderer) {
        self.particle.render_with_colors(
            renderer,
            Some(if self.particle.radius() > self.particle.decay() * 2.0 {
                util::darken_color(self.particle.color())
            } else {
                Color::Black
            }),
            None,
        );
    }
}

#[derive(Debug)]
pub enum TrailType {
    None,
    Basic {
        lifetime: f32,
        spread: f32,
        color: Color,
    },
}
