use std::{error::Error, time};

#[cfg(not(target_arch = "wasm32"))]
fn main() -> Result<(), Box<dyn Error>> {
    use std::io;

    let mut fireworks = fireworks::Fireworks::new(Some(io::stdout().lock()));

    const FRAME_RATES: &[u32] = &[1, 3, 5, 10, 15, 30, 60];
    let mut frame_rate_index = FRAME_RATES.len() - 1;

    let mut frame_time =
        time::Duration::from_nanos(1_000_000_000 / FRAME_RATES[frame_rate_index] as u64);
    let mut dropped_frame_counter: i32 = 0;

    let instant = time::Instant::now();

    fireworks::seed_rand(
        time::SystemTime::now()
            .duration_since(time::SystemTime::UNIX_EPOCH)
            .unwrap_or(time::Duration::ZERO)
            .as_secs(),
    );
    let mut current_time = time::Duration::ZERO;

    'outer: loop {
        fireworks.update_and_draw(frame_time.as_secs_f32());

        use crossterm::event;
        while event::poll(std::time::Duration::ZERO)? {
            match event::read()? {
                event::Event::Resize(width, height) => {
                    fireworks.handle_resize(width, height);
                }
                event::Event::Key(e) => {
                    if e.modifiers.contains(event::KeyModifiers::CONTROL)
                        && e.code == event::KeyCode::Char('c')
                    {
                        break 'outer;
                    }

                    if let Some(char) = match e.code {
                        event::KeyCode::Esc => Some('\x1b'),
                        event::KeyCode::Backspace => Some('\x03'),
                        event::KeyCode::Char(ch) => Some(ch),
                        _ => None,
                    } {
                        fireworks.handle_key(char);
                    }
                }
                _ => (),
            }
        }

        let elapsed = instant.elapsed();
        current_time += frame_time;
        if elapsed <= current_time {
            let sleep_time = current_time - elapsed;
            std::thread::sleep(sleep_time);

            if dropped_frame_counter > 0 {
                dropped_frame_counter -= 1;
            } else if frame_rate_index < FRAME_RATES.len() - 1 {
                frame_rate_index += 1;
                frame_time = time::Duration::from_nanos(
                    1_000_000_000 / FRAME_RATES[frame_rate_index] as u64,
                );
            }
        } else {
            current_time = elapsed;

            dropped_frame_counter += 5;
            if dropped_frame_counter > 30 && frame_rate_index > 0 {
                frame_rate_index -= 1;
                frame_time = time::Duration::from_nanos(
                    1_000_000_000 / FRAME_RATES[frame_rate_index] as u64,
                );
                dropped_frame_counter -= 10;
            }
        }
    }

    Ok(())
}

#[cfg(target_arch = "wasm32")]
fn main() -> ! {
    unreachable!("web build should enter through javascript");
}
