use crate::math::Vec2;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::{convert::IntoWasmAbi, prelude::*};

#[derive(Copy, Clone, PartialEq, Eq, Debug)]
pub enum Color {
    Black = 0,
    Red = 1,
    DarkRed = 2,
    Green = 3,
    DarkGreen = 4,
    Yellow = 5,
    DarkYellow = 6,
    Blue = 7,
    DarkBlue = 8,
    Magenta = 9,
    DarkMagenta = 10,
    Cyan = 11,
    DarkCyan = 12,
    Grey = 13,
    DarkGrey = 14,
    White = 15,

    Transparent = 16,
}
#[cfg(not(target_arch = "wasm32"))]
impl From<Color> for crossterm::style::Color {
    fn from(value: Color) -> Self {
        match value {
            Color::Black => Self::Black,
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
}
impl Default for Cell {
    fn default() -> Self {
        Self::EMPTY
    }
}

#[repr(C)]
// #[cfg_attr(target_arch = "wasm32")]
pub struct CellChange {
    pub x: u16,
    pub y: u16,
    pub cell: Cell,
}
impl CellChange {
    fn new(x: u16, y: u16, cell: Cell) -> Self {
        Self { x, y, cell }
    }
}

#[cfg(target_arch = "wasm32")]
mod wasm {
    // TODO am i doing this right??? there's like no documentation on this anywhere >:(
    impl wasm_bindgen::describe::WasmDescribeVector for CellChange {
        fn describe_vector() {
            <u64>::describe_vector()
        }
    }
    impl wasm_bindgen::convert::VectorIntoWasmAbi for CellChange {
        type Abi = wasm_bindgen::convert::WasmSlice;
        fn vector_into_abi(slice: Box<[Self]>) -> Self::Abi {
            let mut vec = Vec::new();
            vec.reserve_exact(slice.len());
            for val in slice.iter() {
                vec.push(
                    (val.x as u64) << 48
                        | (val.y as u64) << 32
                        | (val.cell.bg.unwrap_or(Color::Black) as u64) << 16
                        | (val.cell.fg as u64) << 8
                        | (TryInto::<u8>::try_into(val.cell.ch).expect("can't convert char to byte")
                            as u64),
                )
            }
            vec.into_boxed_slice().into_abi()
        }
    }
}

pub struct Renderer {
    width: u16,
    height: u16,
    old_cell_buf: Vec<Cell>,
    cell_buf: Vec<Cell>,

    saturated_buf: Vec<Cell>,

    children: Vec<Self>,
}

impl Renderer {
    pub fn new(width: u16, height: u16) -> Self {
        #[cfg_attr(target_arch = "wasm32", allow(unused_mut))]
        let mut s = Self {
            width: 0,
            height: 0,
            old_cell_buf: Vec::new(),
            cell_buf: Vec::new(),

            saturated_buf: Vec::new(),

            children: Vec::new(),
        };
        s.resize(width, height);
        s
    }

    pub fn new_layer(&mut self) -> usize {
        self.children.push(Self {
            width: 0,
            height: 0,

            old_cell_buf: Vec::new(),
            cell_buf: Vec::new(),

            saturated_buf: Vec::new(),

            children: Vec::new(),
        });
        let layer = self.children.last_mut().unwrap();
        layer.resize(self.width, self.height);
        layer.clear_buffer();
        self.children.len() - 1
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

    pub fn resize(&mut self, width: u16, height: u16) {
        self.width = width;
        self.height = height;
        let buf_size = (self.width as u32)
            .checked_mul(self.height as u32)
            .and_then(|size| size.try_into().ok())
            .expect("resize() called with overflowing dimensions");
        self.cell_buf.resize(buf_size, Cell::EMPTY);
        self.old_cell_buf.resize(buf_size, Cell::EMPTY);

        for layer in &mut self.children {
            layer.resize(width, height);
        }
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

    pub fn get_changes(&self) -> Vec<CellChange> {
        let mut res = Vec::new();
        for y in 0..self.height {
            for x in 0..self.width {
                let index = (x as u32 * self.height as u32 + y as u32) as usize;
                if self.old_cell_buf[index] == self.cell_buf[index] {
                    continue;
                }
                res.push(CellChange::new(x, y, self.cell_buf[index].clone()));
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

pub trait Renderable {
    fn render(&self, renderer: &mut Renderer);
}
