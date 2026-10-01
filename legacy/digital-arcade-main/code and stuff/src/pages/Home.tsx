import React from 'react';
import { Brain, Code, Zap, ArrowRight, Heart, TowerControl as GameController } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const features = [
    {
      icon: Brain,
      title: 'Cognitive Enhancement',
      description: 'Improve problem-solving and logical thinking skills while having fun',
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
      icon: Zap,
      title: 'Quick Breaks',
      description: 'Perfect for short breaks between coding sessions',
    },
  ];

  const benefits = [
    {
      title: "Stress Management",
      description: "Gaming provides a healthy escape from intensive coding sessions, helping reduce mental fatigue and stress.",
      icon: Heart
    },
    {
      title: "Cognitive Development",
      description: "Our games are designed to enhance logical thinking, pattern recognition, and problem-solving abilities.",
      icon: Brain
    },
    {
      title: "Algorithm Visualization",
      description: "Learn and understand complex algorithms through interactive gameplay and visual representations.",
      icon: Code
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black">
      {/* Hero Section */}
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-500 to-purple-500 text-transparent bg-clip-text animate-gradient">
            Code. Play. Refresh.
          </h1>
          <p className="text-gray-300 text-xl mb-8 max-w-2xl mx-auto">
            Take a break from coding and enhance your problem-solving skills with our collection of games designed specifically for developers.
          </p>
          <Link
            to="/games"
            className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105"
          >
            Start Playing Now
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-xl bg-gradient-to-br from-purple-900/40 to-black border border-purple-500/20 backdrop-blur-sm hover:border-purple-500/40 transition-all duration-300"
            >
              <feature.icon className="w-12 h-12 text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Why Digital Arcade?</h2>
          <p className="text-xl text-gray-300">Designed specifically for developers to enhance skills while taking breaks</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="p-8 rounded-xl bg-purple-900/20 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300">
              <benefit.icon className="w-16 h-16 text-purple-400 mb-6" />
              <h3 className="text-2xl font-semibold text-white mb-4">{benefit.title}</h3>
              <p className="text-gray-400">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}