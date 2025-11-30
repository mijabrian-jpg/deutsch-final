import React from "react";

export const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`glass-panel rounded-3xl p-6 md:p-8 transition-all duration-500 ${className}`}>{children}</div>
);

export const PrimaryButton: React.FC<{ onClick?: () => void; children: React.ReactNode; className?: string; disabled?: boolean }> = ({ onClick, children, className = "", disabled = false }) => (
  <button onClick={onClick} disabled={disabled} className={`px-6 py-3 rounded-full font-medium text-sm md:text-base tracking-wide bg-white text-black hover:bg-gray-100 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${className}`}>{children}</button>
);

export const SecondaryButton: React.FC<{ onClick?: () => void; children: React.ReactNode; className?: string }> = ({ onClick, children, className = "" }) => (
  <button onClick={onClick} className={`px-6 py-3 rounded-full font-medium text-sm md:text-base tracking-wide bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 active:scale-95 transition-all duration-300 ${className}`}>{children}</button>
);

export const GlassInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className={`w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:bg-black/30 transition-all duration-300 ${props.className}`} />
);

export const GlassTextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea {...props} className={`w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:bg-black/30 transition-all duration-300 min-h-[120px] resize-y ${props.className}`} />
);

export const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>
);
