use std::{error::Error, time};

use crate::math::Vec2;

mod firework;
mod math;
mod menu;
mod particle;
mod renderer;
mod util;
mod world;

#[allow(unused)]
mod dummy {
    pub struct DummyRenderer {
        width: u16,
        height: u16,
    }
    impl DummyRenderer {
        pub fn new() -> std::io::Result<Self> {
            crossterm::terminal::enable_raw_mode()?;
            let term_size = crossterm::terminal::size()?;
            Ok(Self {
                width: term_size.0,
                height: term_size.1,
            })
        }
        pub fn resize(&mut self, width: u16, height: u16) {
            self.width = width;
            self.height = height;
        }
        pub fn render<T>(&self, _: T) {}
        pub fn width(&self) -> u16 {
            self.width
        }
        pub fn height(&self) -> u16 {
            self.height
        }
        pub fn flush(&self) -> std::io::Result<()> {
            Ok(())
        }
    }
    impl Drop for DummyRenderer {
        fn drop(&mut self) {
            crossterm::terminal::disable_raw_mode().expect("failed to disable raw mode");
        }
    }
}

fn summon_firework(renderer: &renderer::Renderer, world: &mut world::World) {
    use crossterm::style::Color;

    #[derive(Clone, Copy)]
    enum FireworkType {
        Standard,
        Streamer,
        Nested,
    }

    let firework_type = if util::probability(0.1) {
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
            Vec2::new(util::fuzzy(0.0, 20.0), firework_speed_fac * -3.0),
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
        firework_speed_fac * 1.3,
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
                                        color: util::darken_color(firework_color),
                                        gradient: util::choice(TRAIL_GRADIENTS),

                                        particle_frequency: 20.0,

                                        background_color_set_fac: 0.0,

                                        propulsion_force: 0.0,

                                        wobble_force: util::rand_range(0.0, 30.0),
                                        wobble_frequency: util::fuzzy(30.0, 10.0),
                                    }
                                } else {
                                    firework::TrailType::None
                                }
                            } else {
                                firework::TrailType::Basic {
                                    lifetime: 0.05 * firework_explosion_fac,
                                    spread: 1.5 * firework_explosion_fac,
                                    color: firework_color,
                                    gradient: util::choice(TRAIL_GRADIENTS),
                                    particle_frequency: util::rand_range(60.0, 180.0),

                                    background_color_set_fac: 0.0,

                                    propulsion_force: 100.0,

                                    wobble_force: util::rand_range(400.0, 500.0),
                                    wobble_frequency: util::fuzzy(30.0, 10.0),
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
                if util::probability(0.7) {
                    firework::TrailType::Basic {
                        lifetime: 2.0 * firework_explosion_fac,
                        spread: 15.0 * firework_explosion_fac,
                        color: util::darken_color(firework_color),
                        gradient: util::choice(TRAIL_GRADIENTS),

                        particle_frequency: 60.0,

                        background_color_set_fac: 0.0,

                        propulsion_force: 160.0,

                        wobble_force: util::rand_range(0.0, 100.0),
                        wobble_frequency: util::fuzzy(30.0, 10.0),
                    }
                } else {
                    firework::TrailType::None
                }
            }
            FireworkType::Streamer => firework::TrailType::Basic {
                lifetime: 2.0 * firework_explosion_fac,
                spread: 15.0 * firework_explosion_fac,
                color: firework_color,
                gradient: util::choice(TRAIL_GRADIENTS),

                particle_frequency: util::rand_range(60.0, 180.0),

                background_color_set_fac: 0.85,

                propulsion_force: 160.0,

                wobble_force: util::rand_range(100.0, 400.0),
                wobble_frequency: util::fuzzy(40.0, 20.0),
            },
        },
        [
            Some(firework_color),
            secondary_firework_color,
            tertiary_firework_color,
        ]
        .iter()
        .filter_map(|x| *x)
        .collect(),
    ));
}

fn main() -> Result<(), Box<dyn Error>> {
    let mut renderer = renderer::Renderer::new(std::io::stdout().lock())?;
    let firework_layer = renderer.new_layer()?;
    // let mut renderer = dummy::DummyRenderer::new()?;

    let mut frame_rate: u32 = 24;
    let mut frame_time = time::Duration::from_nanos(1_000_000_000 / frame_rate as u64);
    let mut dropped_frame_counter: i32 = 0;

    let instant = time::Instant::now();
    let mut current_time = time::Duration::ZERO;

    let mut world = world::World::new();

    let mut paused = false;

    'outer: loop {
        if !paused {
            world.update(frame_time.as_secs_f32());
            let firework_layer = renderer.get_layer(firework_layer);
            firework_layer.clear_buffer();
            firework_layer.render(&world);

            if util::probability(5.0 * frame_time.as_secs_f32()) {
                summon_firework(firework_layer, &mut world);
            }
        }

        use crossterm::event;
        while event::poll(time::Duration::ZERO)? {
            match event::read()? {
                event::Event::Resize(width, height) => {
                    renderer.resize(width, height)?;
                }
                event::Event::Key(e) => {
                    if e.modifiers.contains(event::KeyModifiers::CONTROL)
                        && e.code == event::KeyCode::Char('c')
                    {
                        break 'outer;
                    }
                    if e.code == event::KeyCode::Esc {
                        paused = !paused;
                        if paused {
                            renderer.get_layer(firework_layer).desaturate();
                        } else {
                            renderer.get_layer(firework_layer).resaturate();
                        }
                    }
                    if e.code == event::KeyCode::Char(' ') {
                        summon_firework(renderer.get_layer(firework_layer), &mut world);
                    }
                }
                _ => (),
            }
        }

        renderer.clear_buffer();
        renderer.stack_layers();
        renderer.flush()?;

        let elapsed = instant.elapsed();
        current_time += frame_time;
        if elapsed <= current_time {
            let sleep_time = current_time - elapsed;
            std::thread::sleep(sleep_time);

            if dropped_frame_counter > 0 {
                dropped_frame_counter -= 1;
            } else if frame_rate < 24 {
                frame_rate = match frame_rate {
                    1 => 3,
                    3 => 5,
                    5 => 10,
                    10 => 15,
                    15 => 24,
                    _ => unreachable!(),
                };
                frame_time = time::Duration::from_nanos(1_000_000_000 / frame_rate as u64);
            }
        } else {
            current_time = elapsed;

            dropped_frame_counter += 5;
            if dropped_frame_counter > 24 {
                frame_rate = match frame_rate {
                    24 => 15,
                    15 => 10,
                    10 => 5,
                    5 => 3,
                    3 => 1,
                    _ => unreachable!(),
                };
                frame_time = time::Duration::from_nanos(1_000_000_000 / frame_rate as u64);
                dropped_frame_counter -= 10;
            }
        }
    }

    Ok(())
}
