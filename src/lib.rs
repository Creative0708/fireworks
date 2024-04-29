mod firework;
mod math;
mod menu;
mod particle;
mod renderer;
mod util;
mod world;

pub use util::seed_rand;

fn summon_firework(renderer: &renderer::Renderer, world: &mut world::World) {
    use crate::math::Vec2;
    use renderer::Color;

    #[derive(Clone, Copy)]
    enum FireworkType {
        Standard,
        Streamer,
        Nested,
    }

    let firework_type = if util::probability(0.0) {
        FireworkType::Nested
    } else {
        util::choice(&[FireworkType::Standard, FireworkType::Streamer])
    };

    const ALL_COLORS: &[Color] = &[
        Color::Red,
        Color::Green,
        Color::Yellow,
        Color::Blue,
        Color::Magenta,
        Color::Cyan,
        Color::White,
        Color::Grey,
    ];
    const GRADIENTS: &[&[u8]] = &[b".,:;*&@", br#"'"~*^&#"#, b"`-=!%$", br#"' " ~ * ^ & #"#];
    const TRAIL_GRADIENTS: &[&[u8]] = &[b".-.-*+*+", b"<^>v<^>v", b"/-\\|/-\\|"];

    let firework_color = util::choice(ALL_COLORS);
    let secondary_firework_color = util::probability(0.2).then(|| util::choice(ALL_COLORS));
    let tertiary_firework_color = util::probability(0.2).then(|| util::choice(ALL_COLORS));

    let firework_colors: Vec<Color> = [
        Some(firework_color),
        secondary_firework_color,
        tertiary_firework_color,
    ]
    .iter()
    .filter_map(|x| *x)
    .collect();
    let darkened_firework_colors = util::darken_colors(&firework_colors);

    let firework_explosion_fac = util::rand_range(0.5, 1.7);
    let firework_speed_fac = util::rand_range(0.5, 1.0)
        * (renderer.height() as f32 * 0.03)
        * (firework_explosion_fac * 0.2 + 1.0);

    // great code practices going on here
    world.add_firework(firework::Firework::new(
        particle::Particle::new(
            Vec2::new(
                util::rand_range(-2.0, (renderer.width() + 2) as f32),
                renderer.height() as f32 + 3.0,
            ),
            Vec2::new(util::fuzzy(0.0, 40.0), firework_speed_fac * -30.0),
            3.0,
            0.05,
            match firework_type {
                FireworkType::Standard | FireworkType::Nested => 0.01,
                FireworkType::Streamer => 0.0,
            },
            0.0,
            firework_color,
            b":#",
        ),
        firework_speed_fac * 0.5 + 0.7,
        util::fuzzy(0.5, 1.5),
        match firework_type {
            FireworkType::Standard | FireworkType::Nested => firework::FireworkType::Standard {
                num_particles: (match firework_type {
                    FireworkType::Nested => 10.0 * firework_explosion_fac + 5.0,
                    _ => 40.0 * firework_explosion_fac * firework_explosion_fac,
                }) as _,
                radius: 40.0 * firework_explosion_fac,
                particle_radius: 0.3,
                particle_lifespan: 2.0,
                particle_gradient: util::choice(GRADIENTS),
                particle_glow_fac: util::fuzzy(firework_explosion_fac * 0.1, 0.1),

                nested_firework: match firework_type {
                    FireworkType::Nested => Some(Box::new({
                        let is_standard = util::probability(0.5);
                        firework::Firework::new(
                            particle::Particle::new(
                                Vec2::ZERO,
                                Vec2::ZERO,
                                1.0,
                                0.1,
                                0.1,
                                1.0,
                                firework_color,
                                util::choice(GRADIENTS),
                            ),
                            util::fuzzy(firework_speed_fac * 0.2 + 0.1, 0.03),
                            util::fuzzy(0.5, 1.0),
                            if is_standard {
                                firework::FireworkType::Standard {
                                    num_particles: (5.0 * firework_explosion_fac) as _,
                                    radius: util::fuzzy(20.0, 10.0),
                                    particle_radius: 0.3,
                                    particle_lifespan: 0.2,
                                    particle_gradient: util::choice(GRADIENTS),
                                    particle_glow_fac: 0.2,
                                    nested_firework: None,
                                }
                            } else {
                                firework::FireworkType::None
                            },
                            if is_standard {
                                if util::probability(0.7) {
                                    firework::TrailType::Basic {
                                        lifetime: 0.05 * firework_explosion_fac,
                                        spread: 1.5 * firework_explosion_fac,
                                        gradient: util::choice(TRAIL_GRADIENTS),

                                        particle_frequency: 20.0,

                                        background_color_set_fac: 0.0,

                                        propulsion_force: 0.0,

                                        wobble_force: util::rand_range(0.0, 30.0),
                                        wobble_frequency: util::fuzzy(30.0, 10.0),

                                        colors: darkened_firework_colors.clone(),
                                    }
                                } else {
                                    firework::TrailType::None {
                                        propulsion_force: 0.0,
                                    }
                                }
                            } else {
                                firework::TrailType::Basic {
                                    lifetime: 0.05 * firework_explosion_fac,
                                    spread: 1.5 * firework_explosion_fac,
                                    gradient: util::choice(TRAIL_GRADIENTS),
                                    particle_frequency: util::rand_range(60.0, 180.0),

                                    background_color_set_fac: 0.0,

                                    propulsion_force: 100.0,

                                    wobble_force: util::rand_range(400.0, 500.0),
                                    wobble_frequency: util::fuzzy(30.0, 10.0),

                                    colors: firework_colors.clone(),
                                }
                            },
                            vec![firework_color],
                        )
                    })),
                    _ => None,
                },
            },
            FireworkType::Streamer => firework::FireworkType::None,
        },
        match firework_type {
            FireworkType::Standard | FireworkType::Nested => {
                if util::probability(0.8) {
                    firework::TrailType::Basic {
                        lifetime: 2.0 * firework_explosion_fac,
                        spread: 15.0 * firework_explosion_fac,
                        gradient: util::choice(TRAIL_GRADIENTS),

                        particle_frequency: 60.0,

                        background_color_set_fac: 0.0,

                        propulsion_force: 160.0,

                        wobble_force: util::rand_range(0.0, 100.0),
                        wobble_frequency: util::fuzzy(30.0, 10.0),

                        colors: darkened_firework_colors.clone(),
                    }
                } else {
                    firework::TrailType::None {
                        propulsion_force: 160.0,
                    }
                }
            }
            FireworkType::Streamer => firework::TrailType::Basic {
                lifetime: 2.0 * firework_explosion_fac,
                spread: 15.0 * firework_explosion_fac,
                gradient: util::choice(TRAIL_GRADIENTS),

                particle_frequency: util::rand_range(60.0, 180.0),

                background_color_set_fac: 0.85,

                propulsion_force: 160.0,

                wobble_force: util::rand_range(100.0, 400.0),
                wobble_frequency: util::fuzzy(40.0, 20.0),

                colors: firework_colors.clone(),
            },
        },
        firework_colors,
    ));
}

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct Fireworks {
    renderer: renderer::Renderer,
    firework_layer: usize,
    world: world::World,
    paused: bool,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl Fireworks {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(constructor))]
    pub fn new(terminal: Option<renderer::Terminal>) -> Self {
        let mut renderer = renderer::Renderer::new(terminal).expect("failed to create renderer");
        Self {
            firework_layer: renderer.new_layer().expect("failed to create layer"),
            renderer,
            world: world::World::new(),
            paused: false,
        }
    }

    pub fn update_and_draw(&mut self, frame_time: f32) {
        if !self.paused {
            self.world.update(frame_time);
            let firework_layer = self.renderer.get_layer(self.firework_layer);
            firework_layer.clear_buffer();
            firework_layer.render(&self.world);

            if util::probability(2.0 * frame_time) {
                summon_firework(firework_layer, &mut self.world);
            }
        }

        self.renderer.clear_buffer();
        self.renderer.stack_layers();
        self.renderer.flush().expect("failed to flush");
    }

    #[cfg(target_arch = "wasm32")]
    pub fn get_renderer_changes(&self) -> Vec<u64> {
        self.renderer.get_changes()
    }

    pub fn handle_resize(&mut self, width: u16, height: u16) {
        self.renderer
            .resize(width, height)
            .expect("failed to resize");
    }
    pub fn handle_key(&mut self, key: char) {
        if key == '\x1b' {
            self.paused = !self.paused;
            if self.paused {
                self.renderer.get_layer(self.firework_layer).desaturate();
            } else {
                self.renderer.get_layer(self.firework_layer).resaturate();
            }
        }
        if key == ' ' {
            summon_firework(
                self.renderer.get_layer(self.firework_layer),
                &mut self.world,
            );
        }
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
fn start() {
    console_error_panic_hook::set_once();
}
