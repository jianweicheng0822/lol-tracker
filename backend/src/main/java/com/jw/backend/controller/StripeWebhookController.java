package com.jw.backend.controller;

import com.jw.backend.service.SubscriptionService;
import com.stripe.model.Event;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stripe")
public class StripeWebhookController {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookController.class);

    private final SubscriptionService subscriptionService;

    @Value("${stripe.webhook-secret:}")
    private String webhookSecret;

    public StripeWebhookController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        if (webhookSecret.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("Webhooks not configured");
        }

        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (Exception e) {
            log.warn("Stripe webhook signature verification failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Invalid signature");
        }

        try {
            handleEvent(event);
        } catch (Exception e) {
            log.error("Error processing Stripe event {}: {}", event.getId(), e.getMessage());
        }

        // Always return 200 to Stripe to prevent retries
        return ResponseEntity.ok("ok");
    }

    private void handleEvent(Event event) {
        switch (event.getType()) {
            case "checkout.session.completed" -> {
                Session session = (Session) event.getDataObjectDeserializer()
                        .getObject().orElse(null);
                if (session != null && session.getSubscription() != null) {
                    subscriptionService.activateSubscription(
                            session.getCustomer(),
                            session.getSubscription());
                    log.info("Subscription activated for customer {}", session.getCustomer());
                }
            }
            case "customer.subscription.updated" -> {
                Subscription sub = (Subscription) event.getDataObjectDeserializer()
                        .getObject().orElse(null);
                if (sub != null) {
                    subscriptionService.updateSubscriptionStatus(sub.getId(), sub.getStatus());
                    log.info("Subscription {} updated to status {}", sub.getId(), sub.getStatus());
                }
            }
            case "customer.subscription.deleted" -> {
                Subscription sub = (Subscription) event.getDataObjectDeserializer()
                        .getObject().orElse(null);
                if (sub != null) {
                    subscriptionService.cancelSubscription(sub.getId());
                    log.info("Subscription {} cancelled", sub.getId());
                }
            }
            case "invoice.payment_failed" -> {
                var invoice = event.getDataObjectDeserializer().getObject().orElse(null);
                if (invoice != null) {
                    // Extract subscription from invoice via reflection-safe cast
                    try {
                        var subId = ((com.stripe.model.Invoice) invoice).getSubscription();
                        if (subId != null) {
                            subscriptionService.updateSubscriptionStatus(subId, "past_due");
                            log.info("Subscription {} marked past_due due to payment failure", subId);
                        }
                    } catch (Exception e) {
                        log.warn("Could not extract subscription from invoice event");
                    }
                }
            }
            default -> log.debug("Unhandled Stripe event type: {}", event.getType());
        }
    }
}
