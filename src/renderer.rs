use std::io::{self, Write};

use crossterm::{execute, queue, style::Color};

use crate::math::Vec2;

#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Cell {
    pub bg: Color,
    pub fg: Color,
    pub ch: char,
}
impl Cell {
    pub const EMPTY: Self = Self {
        bg: Color::Black,
        fg: Color::White,
        ch: ' ',
    };
}

pub struct Renderer {
    stdout: io::StdoutLock<'static>,

    width: u16,
    height: u16,
    old_cell_buf: Vec<Cell>,
    cell_buf: Vec<Cell>,

    saturated_buf: Vec<Cell>,
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
            stdout,

            width: 0,
            height: 0,
            old_cell_buf: Vec::new(),
            cell_buf: Vec::new(),

            saturated_buf: Vec::new(),
        };
        s.resize(term_size.0 as _, term_size.1 as _)?;
        Ok(s)
    }

    pub fn resize(&mut self, width: u16, height: u16) -> io::Result<()> {
        self.width = width;
        self.height = height;
        let buf_size = self
            .width
            .checked_mul(self.height)
            .and_then(|size| size.try_into().ok())
            .expect("resize() called with overflowing dimensions");
        self.cell_buf.resize(buf_size, Cell::EMPTY);
        self.old_cell_buf.resize(buf_size, Cell::EMPTY);

        self.clear()?;

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
                self.cell_buf[index] = Cell {
                    bg: crate::util::desaturate_color(self.saturated_buf[index].bg),
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

    pub fn clear(&mut self) -> io::Result<()> {
        use crossterm::style::{self, Stylize};
        queue!(
            self.stdout,
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

        Ok(())
    }

    pub fn flush(&mut self) -> io::Result<()> {
        let mut last_modified_pos = (u16::MAX, u16::MAX);
        for y in 0..self.height {
            for x in 0..self.width {
                use crossterm::{
                    cursor,
                    style::{self, Stylize},
                };

                let index = (x * self.height + y) as usize;
                if self.old_cell_buf[index] == self.cell_buf[index] {
                    continue;
                }
                if last_modified_pos != (x.wrapping_sub(1), y) {
                    queue!(self.stdout, cursor::MoveTo(x as _, y as _))?;
                }
                let cell = &self.cell_buf[index];
                queue!(
                    self.stdout,
                    style::PrintStyledContent(cell.ch.stylize().with(cell.fg).on(cell.bg))
                )?;

                last_modified_pos = (x, y);
            }
        }

        self.stdout.flush()?;
        Ok(())
    }
    pub fn clear_buffer(&mut self) {
        std::mem::swap(&mut self.cell_buf, &mut self.old_cell_buf);
        self.cell_buf.fill(Cell::EMPTY);
    }

    pub fn set_if_in_bounds(&mut self, pos: Vec2, cell: Cell) {
        let Vec2 { x, y } = pos;
        if x < 0.0 || x >= self.width as f32 || y < 0.0 || y >= self.height as f32 {
            return;
        }
        self.cell_buf[x as usize * self.height as usize + y as usize] = cell;
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
        execute!(
            self.stdout,
            crossterm::terminal::LeaveAlternateScreen,
            crossterm::cursor::Show
        )
        .expect("failed to execute on stdout");
        crossterm::terminal::disable_raw_mode().expect("failed to disable raw mode");
    }
}

pub trait Renderable {
    fn render(&self, renderer: &mut Renderer);
}
