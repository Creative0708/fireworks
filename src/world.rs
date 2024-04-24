use std::collections::HashMap;

use crate::{firework::Firework, particle::Particle, util};

#[derive(Debug, Default)]
pub struct World {
    particles: HashMap<u64, Particle>,
    fireworks: HashMap<u64, Firework>,
}

impl World {
    pub fn new() -> Self {
        Default::default()
    }

    pub fn update(&mut self, delta: f32) {
        let mut particles_to_remove = Vec::new();
        let mut fireworks_to_remove = Vec::new();
        for (&id, particle) in &mut self.particles {
            if !particle.update(delta) {
                particles_to_remove.push(id)
            }
        }
        let mut fireworks = std::mem::take(&mut self.fireworks);
        for (&id, firework) in &mut fireworks {
            if !firework.update(delta, self) {
                fireworks_to_remove.push(id)
            }
        }
        self.fireworks = fireworks;

        for id in particles_to_remove {
            self.particles.remove(&id);
        }
        for id in fireworks_to_remove {
            self.fireworks.remove(&id);
        }
    }

    pub fn add_particle(&mut self, particle: Particle) {
        self.particles.insert(util::id(), particle);
    }
    pub fn add_firework(&mut self, firework: Firework) {
        self.fireworks.insert(util::id(), firework);
    }
}

impl crate::renderer::Renderable for World {
    fn render(&self, renderer: &mut crate::renderer::Renderer) {
        for particle in self.particles.values() {
            renderer.render(particle);
        }
        for firework in self.fireworks.values() {
            renderer.render(firework);
        }
    }
}
