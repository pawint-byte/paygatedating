import { Send, MessageCircle, Camera, Video, Phone, ArrowRight } from "lucide-react";
import { GATE_COSTS } from "@shared/schema";

const gates = [
  {
    number: 1,
    title: "Initial Reach-Out",
    description: "Send a personalized message to spark interest",
    icon: Send,
    cost: GATE_COSTS.gate1,
    payer: "Initiator",
    unlocks: "Interest request sent",
  },
  {
    number: 2,
    title: "Acceptance & Response",
    description: "Accept and view the message, send initial reply",
    icon: MessageCircle,
    cost: GATE_COSTS.gate2,
    payer: "Recipient",
    unlocks: "View message & reply",
  },
  {
    number: 3,
    title: "Conversation Deepening",
    description: "Unlock multimedia sharing and private chat room",
    icon: Camera,
    cost: GATE_COSTS.gate3,
    payer: "Initiator",
    unlocks: "Photos & videos chat",
  },
  {
    number: 4,
    title: "Virtual Engagement",
    description: "Access video calls and shared activities",
    icon: Video,
    cost: GATE_COSTS.gate4,
    payer: "Recipient",
    unlocks: "Video dates & games",
  },
  {
    number: 5,
    title: "Contact Exchange",
    description: "Request and share real contact details",
    icon: Phone,
    cost: GATE_COSTS.gate5,
    payer: "Both",
    unlocks: "Phone/email exchange",
  },
];

export function GateTimeline() {
  return (
    <section id="how-it-works" className="py-20 bg-card/50">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-medium tracking-wide uppercase text-sm mb-3">
            The 5-Gate System
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-serif mb-4">
            How PayGate Works
          </h2>
          <p className="text-muted-foreground text-lg">
            Every stage requires investment from both parties, ensuring mutual
            interest and filtering out low-effort interactions.
          </p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4">
            {gates.map((gate, index) => {
              const Icon = gate.icon;
              return (
                <div
                  key={gate.number}
                  className="relative flex flex-col items-center text-center"
                  data-testid={`gate-${gate.number}`}
                >
                  <div className="relative z-10 mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center ring-4 ring-background">
                      <Icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                      <span className="text-xs font-bold">{gate.number}</span>
                    </div>
                  </div>

                  <div className="bg-card border border-card-border rounded-lg p-5 w-full hover-elevate">
                    <h3 className="font-semibold text-base mb-2">{gate.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {gate.description}
                    </p>

                    <div className="space-y-2 pt-3 border-t border-border">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="font-bold text-primary">${gate.cost}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Paid by:</span>
                        <span className="font-medium">{gate.payer}</span>
                      </div>
                    </div>
                  </div>

                  {index < gates.length - 1 && (
                    <div className="hidden lg:flex absolute top-8 -right-2 z-20">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Total investment per match: ~$75 split between both users
          </p>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <span>Skip-Ahead Option: Pay $50 to bypass all gates</span>
          </div>
        </div>
      </div>
    </section>
  );
}
