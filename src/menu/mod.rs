const TITLE: &str = r#"
╦══╗                        ╦       ╦
║                           ║       ║
╠═╣ ╦ ╦═╗ ╦═╗ ╦ ╦ ╦ ╦═╗ ╦═╗ ║╔╝ ╦═╗ ║
║   ║ ║   ╠═╝ ║ ║ ║ ║ ║ ║   ╠╣  ╚═╗ 
╩   ╩ ╩   ╚═╝ ╚═╩═╝ ╚═╝ ╩   ╩╚╝ ╚═╝ ╝
"#;

pub struct Menu {}

impl Menu {}

impl crate::renderer::Renderable for Menu {
    fn render(&self, renderer: &mut crate::renderer::Renderer) {
        todo!()
    }
}
