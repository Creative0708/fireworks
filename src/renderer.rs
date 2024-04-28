use std::io;

use crate::math::Vec2;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[derive(Copy, Clone, PartialEq, Eq, Debug)]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub enum Color {
    Red = 0,
    DarkRed = 1,
    Green = 2,
    DarkGreen = 3,
    Yellow = 4,
    DarkYellow = 5,
    Blue = 6,
    DarkBlue = 7,
    Magenta = 8,
    DarkMagenta = 9,
    Cyan = 10,
    DarkCyan = 11,
    White = 12,
    Grey = 13,
    DarkGrey = 14,

    Transparent = 15,
}
#[cfg(not(target_arch = "wasm32"))]
impl From<Color> for crossterm::style::Color {
    fn from(value: Color) -> Self {
        match value {
            Color::Red => Self::Red,
            Color::DarkRed => Self::DarkRed,
            Color::Green => Self::Green,
            Color::DarkGreen => Self::DarkGreen,
            Color::Yellow => Self::Yellow,
            Color::DarkYellow => Self::DarkYellow,
            Color::Blue => Self::Blue,
            Color::DarkBlue => Self::DarkBlue,
            Color::Magenta => Self::Magenta,
            Color::DarkMagenta => Self::DarkMagenta,
            Color::Cyan => Self::Cyan,
            Color::DarkCyan => Self::DarkCyan,
            Color::White => Self::White,
            Color::Grey => Self::Grey,
            Color::DarkGrey => Self::DarkGrey,

            Color::Transparent => Self::Reset,
        }
    }
}

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

    #[cfg(not(target_arch = "wasm32"))]
    pub fn queue(&self, terminal: &mut Terminal) -> io::Result<()> {
        use crossterm::{
            queue,
            style::{self, Stylize},
        };
        queue!(
            terminal,
            style::PrintStyledContent(
                self.ch.stylize().with(self.fg.into()).on(self
                    .bg
                    .map(Into::into)
                    .unwrap_or(crossterm::style::Color::Reset))
            )
        )?;
        Ok(())
    }
}
impl Default for Cell {
    fn default() -> Self {
        Self::EMPTY
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub struct CellChange {
    pub index: u32,
    pub bg: Color,
    pub fg: Color,
    pub char: char,
}

// Infallible and () don't work here so...
#[cfg(target_arch = "wasm32")]
pub type Terminal = u8;
#[cfg(not(target_arch = "wasm32"))]
pub type Terminal = io::StdoutLock<'static>;

pub struct Renderer {
    terminal: Option<Terminal>,

    width: u16,
    height: u16,
    old_cell_buf: Vec<Cell>,
    cell_buf: Vec<Cell>,

    saturated_buf: Vec<Cell>,

    children: Vec<Self>,
}

impl Renderer {
    pub fn new(mut terminal: Option<Terminal>) -> io::Result<Self> {
        #[cfg(not(target_arch = "wasm32"))]
        use crossterm::{cursor, execute, terminal};
        #[cfg(not(target_arch = "wasm32"))]
        #[cfg(not(target_arch = "wasm32"))]
        if let Some(ref mut terminal) = terminal {
            terminal::enable_raw_mode()?;
            execute!(
                terminal,
                terminal::EnterAlternateScreen,
                cursor::MoveTo(0, 0),
                cursor::Hide
            )?;
        }

        #[cfg_attr(target_arch = "wasm32", allow(unused_mut))]
        let mut s = Self {
            terminal,

            width: 0,
            height: 0,
            old_cell_buf: Vec::new(),
            cell_buf: Vec::new(),

            saturated_buf: Vec::new(),

            children: Vec::new(),
        };
        #[cfg(not(target_arch = "wasm32"))]
        {
            let term_size = terminal::size()?;
            s.resize(term_size.0 as _, term_size.1 as _)?;
        }
        Ok(s)
    }

    pub fn new_layer(&mut self) -> io::Result<usize> {
        self.children.push(Self {
            terminal: None,
            width: 0,
            height: 0,

            old_cell_buf: Vec::new(),
            cell_buf: Vec::new(),

            saturated_buf: Vec::new(),

            children: Vec::new(),
        });
        let layer = self.children.last_mut().unwrap();
        layer.resize(self.width, self.height)?;
        layer.clear_buffer();
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

        #[cfg(not(target_arch = "wasm32"))]
        if let Some(ref mut terminal) = self.terminal {
            use crossterm::{
                queue,
                style::{self, Stylize},
            };
            queue!(
                terminal,
                style::PrintStyledContent(
                    std::str::from_utf8(&{
                        let mut big_string = Vec::new();
                        big_string.resize(self.width as usize * self.height as usize, b' ');
                        big_string
                    })
                    .unwrap_or_else(|_| unreachable!())
                    .stylize()
                    .on(crossterm::style::Color::Reset)
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

    pub fn text(&mut self, x: u16, y: u16, text: &str, cell: Cell) {
        for (x, ch) in (x..).zip(text.chars()) {
            if x >= self.width {
                break;
            }
            let index = (x as u32 * self.height as u32 + y as u32) as usize;
            self.cell_buf[index] = Cell {
                bg: cell.bg,
                fg: cell.fg,
                ch,
            };
        }
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
        #[cfg(not(target_arch = "wasm32"))]
        if let Some(ref mut terminal) = self.terminal {
            let mut last_modified_pos = (u16::MAX, u16::MAX);
            for y in 0..self.height {
                for x in 0..self.width {
                    use crossterm::{cursor, queue};

                    let index = (x as u32 * self.height as u32 + y as u32) as usize;
                    if self.old_cell_buf[index] == self.cell_buf[index] {
                        continue;
                    }
                    if last_modified_pos != (x.wrapping_sub(1), y) {
                        if last_modified_pos.1 == y {
                            queue!(terminal, cursor::MoveRight(x - last_modified_pos.0 - 1))?;
                        } else {
                            queue!(terminal, cursor::MoveTo(x as _, y as _))?;
                        }
                    }
                    self.cell_buf[index].queue(terminal)?;

                    last_modified_pos = (x, y);
                }
            }

            use std::io::Write;
            terminal.flush()?;
        }
        Ok(())
    }

    #[cfg(target_arch = "wasm32")]
    pub fn get_changes(&self) -> Vec<CellChange> {
        let mut res = Vec::new();
        for y in 0..self.height {
            for x in 0..self.width {
                let index = (x as u32 * self.height as u32 + y as u32) as usize;
                if self.old_cell_buf[index] == self.cell_buf[index] {
                    continue;
                }
                let cell = &self.cell_buf[index];
                res.push(CellChange {
                    index: index as _,
                    bg: cell.bg.unwrap_or(Color::Transparent),
                    fg: cell.fg,
                    char: cell.ch,
                });
            }
        }
        res
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
        #[cfg(not(target_arch = "wasm32"))]
        if let Some(ref mut terminal) = self.terminal {
            crossterm::execute!(
                terminal,
                crossterm::terminal::LeaveAlternateScreen,
                crossterm::cursor::Show
            )
            .expect("failed to execute on terminal");
            crossterm::terminal::disable_raw_mode().expect("failed to disable raw mode");
        }
    }
}

pub trait Renderable {
    fn render(&self, renderer: &mut Renderer);
}
