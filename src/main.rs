use std::{error::Error, time};

#[cfg(not(target_arch = "wasm32"))]
fn main() -> Result<(), Box<dyn Error>> {
    use crossterm::{cursor, execute, terminal};
    use std::io;
    let mut stdout = io::stdout().lock();

    terminal::enable_raw_mode()?;
    execute!(
        stdout,
        terminal::EnterAlternateScreen,
        cursor::MoveTo(0, 0),
        cursor::Hide
    )?;

    let (mut width, mut height) = terminal::size()?;
    let mut fireworks = fireworks::Fireworks::new(width, height);

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
        fireworks.update_and_render(frame_time.as_secs_f32());

        let changes = fireworks.get_renderer_changes();

        let mut last_modified_pos = (u16::MAX, u16::MAX);
        for change in changes {
            use crossterm::{
                queue,
                style::{self, Stylize},
            };

            let (x, y) = (change.x, change.y);

            if last_modified_pos != (x.wrapping_sub(1), y) {
                if last_modified_pos.1 == y {
                    queue!(stdout, cursor::MoveRight(x - last_modified_pos.0 - 1))?;
                } else {
                    queue!(stdout, cursor::MoveTo(x as _, y as _))?;
                }
            }

            let cell = change.cell;

            queue!(
                stdout,
                style::PrintStyledContent(
                    cell.ch.stylize().with(cell.fg.into()).on(cell
                        .bg
                        .map(Into::into)
                        .unwrap_or(crossterm::style::Color::Reset))
                )
            )?;

            last_modified_pos = (x, y);
        }

        io::Write::flush(&mut stdout)?;

        use crossterm::event;
        while event::poll(std::time::Duration::ZERO)? {
            match event::read()? {
                event::Event::Resize(new_width, new_height) => {
                    (width, height) = (new_width, new_height);

                    fireworks.handle_resize(width, height);

                    // clear the screen
                    use crossterm::{
                        queue,
                        style::{self, Stylize},
                    };
                    queue!(
                        stdout,
                        style::PrintStyledContent(
                            std::str::from_utf8(&{
                                let mut big_string = Vec::new();
                                big_string.resize(width as usize * height as usize, b' ');
                                big_string
                            })
                            .unwrap_or_else(|_| unreachable!())
                            .stylize()
                            .on(crossterm::style::Color::Reset)
                        )
                    )?;
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

    crossterm::execute!(
        stdout,
        crossterm::terminal::LeaveAlternateScreen,
        crossterm::cursor::Show
    )?;
    crossterm::terminal::disable_raw_mode()?;

    Ok(())
}

#[cfg(target_arch = "wasm32")]
fn main() -> ! {
    unreachable!("web build should enter through javascript");
}
