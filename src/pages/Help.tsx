import { ChevronDown, HelpCircle, LifeBuoy, Mail, MessageSquare, Phone } from "lucide-react";
import { useState } from "react";

interface FAQ {
  question: string;
  answer: string;
}

export default function Help() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs: FAQ[] = [
    {
      question: "How do I reset my password?",
      answer: "To reset your password, click on the 'Forgot Password' link on the login screen. You will receive an email with instructions to create a new password. If you don't receive the email, please check your spam folder or contact support."
    },
    {
      question: "How do I request time off?",
      answer: "To request time off, navigate to the Schedule section and select 'Time Off Requests'. Click the 'New Request' button, select your dates, provide a reason, and submit. Your manager will be notified and can approve or deny the request."
    },
    {
      question: "How do I view my gratuity reports?",
      answer: "Gratuity reports can be found in the Gratuity section under 'Reports'. You can filter by date range and export reports as needed. If you notice any discrepancies, please contact your manager or the payroll department."
    },
    {
      question: "How do I complete training modules?",
      answer: "Training modules are available in the University section. Navigate to 'Programs' to see all available modules. Click on a module to begin. Your progress is automatically saved, and certificates are issued upon completion."
    },
    {
      question: "How do I swap shifts with another employee?",
      answer: "To swap shifts, go to the Schedule section and select 'Shift Swaps'. Find your shift, click 'Request Swap', and select eligible employees. They will receive a notification and can accept or decline. All swaps require manager approval."
    }
  ];

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center mb-8">
        <HelpCircle className="h-8 w-8 text-primary mr-3" />
        <h1 className="text-2xl font-bold">Help & Support</h1>
      </div>

      {/* Support Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center">
          <MessageSquare className="h-10 w-10 text-primary mb-4" />
          <h2 className="text-lg font-semibold mb-2">Live Chat</h2>
          <p className="text-gray-600 mb-4">Chat with our support team in real-time</p>
          <button className="mt-auto px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
            Start Chat
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center">
          <Mail className="h-10 w-10 text-primary mb-4" />
          <h2 className="text-lg font-semibold mb-2">Email Support</h2>
          <p className="text-gray-600 mb-4">Send us an email and we'll respond within 24 hours</p>
          <a 
            href="mailto:support@e11even.com" 
            className="mt-auto px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Email Us
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center">
          <Phone className="h-10 w-10 text-primary mb-4" />
          <h2 className="text-lg font-semibold mb-2">Phone Support</h2>
          <p className="text-gray-600 mb-4">Call us directly for immediate assistance</p>
          <a 
            href="tel:+13055551234" 
            className="mt-auto px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            (305) 555-1234
          </a>
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-10">
        <h2 className="text-xl font-semibold mb-6">Frequently Asked Questions</h2>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border rounded-md overflow-hidden">
              <button
                className="flex justify-between items-center w-full p-4 text-left font-medium hover:bg-gray-50 focus:outline-none"
                onClick={() => toggleFaq(index)}
              >
                {faq.question}
                <ChevronDown 
                  className={`h-5 w-5 transition-transform ${
                    expandedFaq === index ? "transform rotate-180" : ""
                  }`} 
                />
              </button>
              
              {expandedFaq === index && (
                <div className="p-4 bg-gray-50 border-t">
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Submit a Ticket */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <LifeBuoy className="h-6 w-6 text-primary mr-2" />
          <h2 className="text-xl font-semibold">Submit a Support Ticket</h2>
        </div>
        
        <p className="text-gray-600 mb-6">
          Can't find what you're looking for? Submit a support ticket and our team will get back to you as soon as possible.
        </p>
        
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Brief description of your issue"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Select a category</option>
              <option value="account">Account Access</option>
              <option value="schedule">Scheduling</option>
              <option value="gratuity">Gratuity</option>
              <option value="training">Training & University</option>
              <option value="technical">Technical Issue</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Please provide as much detail as possible"
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attachments (optional)
            </label>
            <input
              type="file"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-sm text-gray-500">
              You can attach screenshots or relevant files (max 5MB)
            </p>
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Submit Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 