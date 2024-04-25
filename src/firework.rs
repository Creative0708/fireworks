use crossterm::style::Color;

use crate::{math::Vec2, particle::Particle, util, world};

#[derive(Debug)]
pub struct Firework {
    particle: Particle,
    target_direction: Vec2,

    lifetime: f32,
    max_lifetime: f32,

    render_radius: f32,

    firework_type: FireworkType,
    trail_type: TrailType,
    colors: Vec<Color>,
}

impl Firework {
    pub fn new(
        particle: Particle,
        lifetime: f32,
        render_radius: f32,
        firework_type: FireworkType,
        trail_type: TrailType,
        colors: Vec<Color>,
    ) -> Self {
        let target_direction = (particle.vel() * Vec2::new(0.2, 1.0)).normalize();
        Self {
            particle,
            target_direction,
            lifetime,
            max_lifetime: lifetime,
            render_radius,
            firework_type,
            trail_type,
            colors,
        }
    }

    pub fn update(&mut self, delta: f32, world: &mut world::World) -> bool {
        self.particle.update(delta);
        self.lifetime -= delta;

        match self.trail_type {
            TrailType::None => (),
            TrailType::Basic {
                propulsion_force,
                wobble_force,
                wobble_frequency,

                particle_frequency,

                background_color_set_fac,

                lifetime,
                spread,
                color,
                gradient,
            } => {
                let vel = self.target_direction * (self.lifetime / self.max_lifetime);
                let wobble = vel.map(|(x, y)| (y, -x))
                    * (((self.lifetime / self.max_lifetime * wobble_frequency)
                        .sin()
                        .cbrt()
                        * 0.5)
                        * wobble_force);

                self.particle.apply_continuous_force(vel * propulsion_force);
                self.particle.apply_continuous_force(wobble);

                for _ in 0..((particle_frequency * delta) as u32) {
                    world.add_particle(Particle::new(
                        self.particle.pos(),
                        util::fuzzy_circle(0.0) * spread - wobble * 0.3,
                        0.03,
                        0.0001,
                        if background_color_set_fac == 0.0 {
                            0.0
                        } else {
                            background_color_set_fac * 0.03
                        },
                        0.03 / util::rand_range(0.2, lifetime),
                        color,
                        gradient,
                    ));
                }
            }
        }

        if self.lifetime <= 0.0 {
            match self.firework_type {
                FireworkType::None => (),
                FireworkType::Standard {
                    num_particles,
                    radius,
                    particle_radius,
                    particle_lifespan,
                    particle_gradient,
                    ..
                } => {
                    for _ in 0..num_particles {
                        let particle_vel_fac = util::fuzzy_circle(0.1);
                        let particle_radius = util::fuzzy(particle_radius, 0.1);
                        world.add_particle(Particle::new(
                            self.particle.pos(),
                            {
                                let mut val = particle_vel_fac * radius;
                                // assume a 1:2 ratio for terminal chars
                                val.x *= 2.0;
                                val
                            },
                            particle_radius,
                            util::fuzzy(0.03, 0.001),
                            particle_radius + particle_vel_fac.mag_sqr() - 0.05,
                            particle_radius / util::fuzzy(particle_lifespan, 0.5),
                            util::choice(&self.colors),
                            particle_gradient,
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
    None,
    Standard {
        num_particles: u32,
        radius: f32,
        particle_radius: f32,
        particle_lifespan: f32,

        particle_gradient: &'static [u8],
    },
}

impl crate::renderer::Renderable for Firework {
    fn render(&self, renderer: &mut crate::renderer::Renderer) {
        let int_radius = self.render_radius.floor() as i32;
        for dx in -int_radius..=int_radius {
            for dy in -int_radius..=int_radius {
                let ch = {
                    let gradient_index = (self.render_radius - ((dx * dx + dy * dy) as f32).sqrt())
                        .min(self.particle.gradient().len() as f32 - 1.0);
                    if gradient_index < 0.0 {
                        continue;
                    }
                    self.particle.gradient()[gradient_index as usize] as char
                };

                renderer.add_if_in_bounds(
                    self.particle.pos() + Vec2::new(dx as _, dy as _),
                    crate::renderer::Cell {
                        bg: None,
                        fg: self.particle.color(),
                        ch,
                    },
                )
            }
        }
        renderer.render(&self.particle);
    }
}

#[derive(Debug)]
pub enum TrailType {
    None,
    Basic {
        lifetime: f32,
        spread: f32,
        color: Color,
        gradient: &'static [u8],

        particle_frequency: f32,

        background_color_set_fac: f32,

        propulsion_force: f32,
        wobble_force: f32,
        wobble_frequency: f32,
    },
}
