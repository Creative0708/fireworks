use std::{error::Error, time};

use rand::Rng;

use crate::math::Vec2;

mod firework;
mod math;
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

fn main() -> Result<(), Box<dyn Error>> {
    let mut renderer = renderer::Renderer::new(std::io::stdout().lock())?;
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
            renderer.render(&world);
        }

        if rand::thread_rng().gen_ratio(1, frame_rate) {
            world.add_firework(firework::Firework::new(
                particle::Particle::new(
                    Vec2::new(
                        util::rand_range(-2.0, (renderer.width() + 2) as f32),
                        renderer.height() as f32 + 3.0,
                    ),
                    Vec2::new(
                        util::fuzzy(0.0, 20.0),
                        util::rand_range(-1.4, -0.7) * renderer.height() as f32,
                    ),
                    3.0,
                    0.05,
                    0.0,
                    crossterm::style::Color::White,
                    b"#",
                ),
                util::rand_range(1.0, 3.0),
                firework::FireworkType::Standard {
                    num_particles: 40,
                    radius: 50.0,
                    particle_radius: 0.3,
                    particle_lifespan: 2.0,
                },
                firework::TrailType::Basic {
                    lifetime: 2.0,
                    spread: 15.0,
                    color: crossterm::style::Color::DarkGrey,
                },
                vec![crossterm::style::Color::White],
            ));
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
                            renderer.desaturate();
                        } else {
                            renderer.resaturate();
                        }
                    }
                }
                _ => (),
            }
        }

        renderer.flush()?;
        renderer.clear_buffer();

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
