import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Mail, MessageCircle, Clock, MapPin, ChevronRight, Send, Loader2 } from "lucide-react";

export default function FarmerSupport() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    // Simulate sending message
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setName("");
      setEmail("");
      setMessage("");
      setTimeout(() => setSent(false), 3000);
    }, 1500);
  };

  const supportOptions = [
    { icon: Phone, title: "Call Us", details: "Toll Free: 1800-180-1551", action: "tel:18001801551", bg: "bg-green-100", textColor: "text-green-700" },
    { icon: Mail, title: "Email Support", details: "support@cropsafe.gov.in", action: "mailto:support@cropsafe.gov.in", bg: "bg-blue-100", textColor: "text-blue-700" },
    { icon: MessageCircle, title: "WhatsApp", details: "+91 98765 43210", action: "https://wa.me/919876543210", bg: "bg-green-100", textColor: "text-green-700" },
  ];

  const faqs = [
    { question: "How to file an insurance claim?", answer: "Go to Claims page → Submit Claim → Fill details → Upload images" },
    { question: "What is NDVI analysis?", answer: "NDVI measures crop health using satellite imagery. Values above 0.6 indicate healthy crops." },
    { question: "How to contact local agriculture officer?", answer: "Call toll-free helpline 1800-180-1551 for officer details in your district." },
    { question: "What is the claim settlement time?", answer: "Claims are processed within 15-30 days after field verification." },
    { question: "How to update farm details?", answer: "Contact your local agriculture officer or call our helpline." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-5 pt-6 pb-8 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">📞 Farmer Support</h1>
        <p className="text-emerald-100 text-sm mt-1">Get help with insurance, claims, and farming</p>
      </div>

      <div className="px-4 space-y-5 mt-5">
        {/* Helpline Banner */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white text-center">
          <Phone className="w-8 h-8 mx-auto mb-2" />
          <p className="text-xs uppercase tracking-wide font-semibold">24/7 Helpline</p>
          <p className="text-2xl font-bold mt-1">1800-180-1551</p>
          <p className="text-sm mt-1">Toll Free • 24x7 Support</p>
        </div>

        {/* Support Options */}
        <div className="grid grid-cols-3 gap-3">
          {supportOptions.map((option, idx) => (
            <a
              key={idx}
              href={option.action}
              className={`${option.bg} rounded-2xl p-4 text-center transition-transform active:scale-95`}
            >
              <option.icon className={`w-6 h-6 mx-auto ${option.textColor}`} />
              <p className="font-semibold text-gray-800 text-sm mt-2">{option.title}</p>
              <p className="text-xs text-gray-500 mt-1 truncate">{option.details}</p>
            </a>
          ))}
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4" /> Send a Message
          </h3>
          
          {sent ? (
            <div className="bg-green-50 text-green-700 p-4 rounded-xl text-center">
              ✅ Message sent successfully! We'll respond within 24 hours.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <textarea
                placeholder="Your Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              />
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {sending ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
        </div>

        {/* Office Locations */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Office Locations
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">Head Office - Pune</p>
                <p className="text-xs text-gray-500">Agriculture College Campus, Shivajinagar, Pune - 411005</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">Regional Office - Mumbai</p>
                <p className="text-xs text-gray-500">CST Road, Kalina, Santacruz East, Mumbai - 400098</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">Regional Office - Nagpur</p>
                <p className="text-xs text-gray-500">Civil Lines, Nagpur - 440001</p>
              </div>
            </div>
          </div>
        </div>

        {/* Office Hours */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Office Hours
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Monday - Friday</span>
              <span className="font-medium">9:00 AM - 6:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Saturday</span>
              <span className="font-medium">10:00 AM - 2:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sunday</span>
              <span className="font-medium text-red-500">Closed</span>
            </div>
          </div>
        </div>

        {/* FAQs Section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <h3 className="font-bold text-emerald-800 mb-3">❓ Frequently Asked Questions</h3>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <details key={idx} className="group">
                <summary className="flex justify-between items-center cursor-pointer text-sm font-medium text-gray-700 py-2">
                  {faq.question}
                  <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                </summary>
                <p className="text-xs text-gray-500 mt-1 pl-4 pb-2">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="bg-red-50 rounded-2xl p-5 border border-red-200">
          <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
            🚨 Emergency Contacts
          </h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">District Agriculture Officer:</span> +91 12345 67890</p>
            <p><span className="font-medium">Crop Insurance Cell:</span> 1800-180-1551 (Ext: 101)</p>
            <p><span className="font-medium">Field Inspector Helpline:</span> +91 98765 43210</p>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => navigate("/chatbot")} 
          className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          Chat with AI Assistant
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div className="flex justify-around items-center">
          <div className="nav-item text-center" onClick={() => navigate("/dashboard")}>
            <i className="fas fa-home text-xl"></i>
            <p className="text-xs mt-1">Home</p>
          </div>
          <div className="nav-item text-center" onClick={() => navigate("/analysis")}>
            <i className="fas fa-chart-line text-xl"></i>
            <p className="text-xs mt-1">Analysis</p>
          </div>
          <div className="nav-item text-center" onClick={() => navigate("/disease")}>
            <i className="fas fa-biohazard text-xl"></i>
            <p className="text-xs mt-1">Disease</p>
          </div>
          <div className="nav-item text-center" onClick={() => navigate("/claims")}>
            <i className="fas fa-file-invoice-dollar text-xl"></i>
            <p className="text-xs mt-1">Claim</p>
          </div>
          <div className="nav-item text-center" onClick={() => navigate("/chatbot")}>
            <i className="fas fa-robot text-xl"></i>
            <p className="text-xs mt-1">AI</p>
          </div>
        </div>
      </div>

      {/* Floating Mic Button */}
      <div className="floating-mic" onClick={() => navigate("/chatbot")}>
        <i className="fas fa-microphone text-white text-xl"></i>
      </div>
    </div>
  );
}