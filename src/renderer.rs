use std::io::{self, Write};

use crossterm::{execute, queue, style::Color};

use crate::math::Vec2;

#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Cell {
    pub bg: Option<Color>,
    pub fg: Color,
    pub ch: char,
}
impl Cell {
    pub const EMPTY: Self = Self {
        bg: None,
        fg: Color::White,
        ch: ' ',
    };
}
impl Default for Cell {
    fn default() -> Self {
        Self::EMPTY
    }
}

pub struct Renderer {
    stdout: Option<io::StdoutLock<'static>>,

    width: u16,
    height: u16,
    old_cell_buf: Vec<Cell>,
    cell_buf: Vec<Cell>,

    saturated_buf: Vec<Cell>,

    children: Vec<Self>,
}

impl Renderer {
    pub fn new(mut stdout: io::StdoutLock<'static>) -> io::Result<Self> {
        use crossterm::{cursor, terminal};
        let term_size = terminal::size()?;
        terminal::enable_raw_mode()?;
        execute!(
            stdout,
            terminal::EnterAlternateScreen,
            cursor::MoveTo(0, 0),
            cursor::Hide
        )?;

        let mut s = Self {
            stdout: Some(stdout),

            width: 0,
            height: 0,
            old_cell_buf: Vec::new(),
            cell_buf: Vec::new(),

            saturated_buf: Vec::new(),

            children: Vec::new(),
        };
        s.resize(term_size.0 as _, term_size.1 as _)?;
        Ok(s)
    }

    pub fn new_layer(&mut self) -> io::Result<usize> {
        self.children.push(Self {
            stdout: None,
            width: 0,
            height: 0,

            old_cell_buf: Vec::new(),
            cell_buf: Vec::new(),

            saturated_buf: Vec::new(),

            children: Vec::new(),
        });
        self.children
            .last_mut()
            .unwrap()
            .resize(self.width, self.height)?;
        Ok(self.children.len() - 1)
    }
    pub fn get_layer(&mut self, index: usize) -> &mut Self {
        self.children.get_mut(index).expect("invalid index")
    }
    pub fn stack_layers(&mut self) {
        for layer in &mut self.children {
            for (this, that) in self.cell_buf.iter_mut().zip(layer.cell_buf.iter()) {
                if that.ch != ' ' {
                    *this = that.clone();
                }
            }
        }
    }

    pub fn resize(&mut self, width: u16, height: u16) -> io::Result<()> {
        self.width = width;
        self.height = height;
        let buf_size = (self.width as u32)
            .checked_mul(self.height as u32)
            .and_then(|size| size.try_into().ok())
            .expect("resize() called with overflowing dimensions");
        self.cell_buf.resize(buf_size, Cell::EMPTY);
        self.old_cell_buf.resize(buf_size, Cell::EMPTY);

        if let Some(ref mut stdout) = self.stdout {
            use crossterm::style::{self, Stylize};
            queue!(
                stdout,
                style::PrintStyledContent(
                    std::str::from_utf8(&{
                        let mut big_string = Vec::new();
                        big_string.resize(self.width as usize * self.height as usize, b' ');
                        big_string
                    })
                    .unwrap_or_else(|_| unreachable!())
                    .stylize()
                    .on_black()
                )
            )?;
        }

        for layer in &mut self.children {
            layer.resize(width, height)?;
        }

        Ok(())
    }

    pub fn render(&mut self, renderable: &impl Renderable) {
        renderable.render(self)
    }

    pub fn desaturate(&mut self) {
        self.saturated_buf.clone_from(&self.cell_buf);
        std::mem::swap(&mut self.old_cell_buf, &mut self.cell_buf);
        for y in 0..self.height {
            for x in 0..self.width {
                let index = (x * self.height + y) as usize;
                if self.cell_buf[index].ch == ' ' {
                    continue;
                }
                self.cell_buf[index] = Cell {
                    bg: self.saturated_buf[index]
                        .bg
                        .map(crate::util::desaturate_color),
                    fg: crate::util::desaturate_color(self.saturated_buf[index].fg),
                    ch: self.saturated_buf[index].ch,
                };
            }
        }
    }
    pub fn resaturate(&mut self) {
        std::mem::swap(&mut self.old_cell_buf, &mut self.cell_buf);
        std::mem::swap(&mut self.cell_buf, &mut self.saturated_buf);
        self.saturated_buf.clear();
    }

    pub fn flush(&mut self) -> io::Result<()> {
        let Some(ref mut stdout) = self.stdout else {
            return Ok(());
        };

        let mut last_modified_pos = (u16::MAX, u16::MAX);
        for y in 0..self.height {
            for x in 0..self.width {
                use crossterm::{
                    cursor,
                    style::{self, Stylize},
                };

                let index = (x as u32 * self.height as u32 + y as u32) as usize;
                if self.old_cell_buf[index] == self.cell_buf[index] {
                    continue;
                }
                if last_modified_pos != (x.wrapping_sub(1), y) {
                    if last_modified_pos.1 == y {
                        queue!(stdout, cursor::MoveRight(x - last_modified_pos.0 - 1))?;
                    } else {
                        queue!(stdout, cursor::MoveTo(x as _, y as _))?;
                    }
                }
                let cell = &self.cell_buf[index];
                queue!(
                    stdout,
                    style::PrintStyledContent(
                        cell.ch
                            .stylize()
                            .with(cell.fg)
                            .on(cell.bg.unwrap_or(Color::Reset))
                    )
                )?;

                last_modified_pos = (x, y);
            }
        }

        stdout.flush()?;

        Ok(())
    }

    pub fn clear_buffer(&mut self) {
        std::mem::swap(&mut self.cell_buf, &mut self.old_cell_buf);
        self.cell_buf.fill(Cell::EMPTY);
    }

    pub fn add_if_in_bounds(&mut self, pos: Vec2, cell: Cell) {
        let Vec2 { x, y } = pos;
        if x < 0.0 || x >= self.width as f32 || y < 0.0 || y >= self.height as f32 {
            return;
        }
        let index = x as usize * self.height as usize + y as usize;
        let target_cell = &mut self.cell_buf[index];
        *target_cell = cell;
    }

    pub fn width(&self) -> u16 {
        self.width
    }
    pub fn height(&self) -> u16 {
        self.height
    }
}

impl Drop for Renderer {
    fn drop(&mut self) {
        if let Some(ref mut stdout) = self.stdout {
            execute!(
                stdout,
                crossterm::terminal::LeaveAlternateScreen,
                crossterm::cursor::Show
            )
            .expect("failed to execute on stdout");
            crossterm::terminal::disable_raw_mode().expect("failed to disable raw mode");
        }
    }
}

pub trait Renderable {
    fn render(&self, renderer: &mut Renderer);
}
