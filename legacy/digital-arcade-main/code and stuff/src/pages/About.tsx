import React from 'react';
import { Brain, Heart, Target, Code, Zap } from 'lucide-react';

export default function About() {
  const team = [
    {
      name: 'Gardas Akash',
      image: 'https://i.imgur.com/IjI5BVu.jpeg',
    },
    {
      name: 'Shaik Safiullah Sahil Hussain',
      image: 'https://i.imgur.com/AKEjoAB.jpeg',
    },
    {
      name: 'Vinjam Bala Krishna Chowdary',
      image: 'https://imgur.com/O7WQq9N.jpg',
    },
  ];

  const benefits = [
    {
      icon: Brain,
      title: 'Brain Boost',
      description: 'Level up your thinking skills while having a blast with our mind-bending games.',
    },
    {
      icon: Heart,
      title: 'Stress Relief',
      description: 'Take a mental break from coding with engaging games',
    },
    {
      icon: Code,
      title: 'Algorithm Practice',
      description: 'Learn and visualize common programming algorithms',
    },
    {
      icon: Target,
      title: 'Level Up',
      description: 'Get better at coding through games that make you think like a programmer.',
    },
    {
      icon: Zap,
      title: 'Quick Breaks',
      description: 'Perfect for those "my code is not working" moments - take 5 and come back fresh!',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-24 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Mission Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-6">What's This All About?</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Digital Arcade is our cool project at CVR College of Engineering where we mix fun with learning. 
            It's made by students, for students - helping our coding buddies take awesome breaks between 
            debugging sessions. Think of it as your digital hangout spot! 🎮
          </p>
        </div>

        {/* Benefits */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Why You'll Love It</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-purple-900/20 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300"
              >
                <benefit.icon className="w-12 h-12 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-gray-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-12">The Squad</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-xl bg-purple-900/20 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 p-6"
              >
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold text-white mb-1">{member.name}</h3>
                {member.role && <p className="text-purple-400">{member.role}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}