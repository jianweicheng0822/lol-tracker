package com.jw.backend.controller;

import com.jw.backend.entity.AppUser;
import com.jw.backend.service.SubscriptionService;
import com.stripe.Stripe;
import com.stripe.model.Customer;
import com.stripe.model.Subscription;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class CheckoutController {

    private final SubscriptionService subscriptionService;

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${stripe.price-id:}")
    private String stripePriceId;

    @Value("${app.base-url:http://localhost:5173}")
    private String appBaseUrl;

    public CheckoutController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @PostConstruct
    void init() {
        if (!stripeSecretKey.isBlank()) {
            Stripe.apiKey = stripeSecretKey;
        }
    }

    @PostMapping("/checkout/session")
    public ResponseEntity<?> createCheckoutSession(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }
        if (stripeSecretKey.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Payments not configured"));
        }

        try {
            AppUser user = subscriptionService.getOrCreateUser(principal.getName());

            String customerId = user.getStripeCustomerId();
            if (customerId == null) {
                CustomerCreateParams customerParams = CustomerCreateParams.builder()
                        .putMetadata("username", principal.getName())
                        .build();
                Customer customer = Customer.create(customerParams);
                customerId = customer.getId();
                subscriptionService.setStripeCustomerId(principal.getName(), customerId);
            }

            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                    .setCustomer(customerId)
                    .setSuccessUrl(appBaseUrl + "/checkout/success?session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(appBaseUrl + "/checkout/cancel")
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setPrice(stripePriceId)
                            .setQuantity(1L)
                            .build())
                    .build();

            com.stripe.model.checkout.Session session =
                    com.stripe.model.checkout.Session.create(params);

            return ResponseEntity.ok(Map.of("url", session.getUrl()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create checkout session"));
        }
    }

    @GetMapping("/subscription")
    public ResponseEntity<?> getSubscription(Principal principal) {
        if (principal == null) {
            return ResponseEntity.ok(Map.of("tier", 0, "status", "none"));
        }

        AppUser user = subscriptionService.getOrCreateUser(principal.getName());
        var result = new java.util.HashMap<String, Object>();
        result.put("tier", user.getTier());
        result.put("status", user.getSubscriptionStatus());

        if (user.getStripeSubscriptionId() != null && !stripeSecretKey.isBlank()) {
            try {
                Subscription sub = Subscription.retrieve(user.getStripeSubscriptionId());
                result.put("currentPeriodEnd", sub.getCurrentPeriodEnd());
                result.put("cancelAtPeriodEnd", sub.getCancelAtPeriodEnd());
            } catch (Exception ignored) {
            }
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping("/subscription/cancel")
    public ResponseEntity<?> cancelSubscription(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        AppUser user = subscriptionService.getOrCreateUser(principal.getName());
        if (user.getStripeSubscriptionId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "No active subscription"));
        }

        try {
            Subscription sub = Subscription.retrieve(user.getStripeSubscriptionId());
            sub.update(Map.of("cancel_at_period_end", true));
            return ResponseEntity.ok(Map.of("cancelAtPeriodEnd", true));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to cancel subscription"));
        }
    }

    @PostMapping("/checkout/portal")
    public ResponseEntity<?> createPortalSession(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        AppUser user = subscriptionService.getOrCreateUser(principal.getName());
        if (user.getStripeCustomerId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "No billing account"));
        }

        try {
            com.stripe.param.billingportal.SessionCreateParams params =
                    com.stripe.param.billingportal.SessionCreateParams.builder()
                            .setCustomer(user.getStripeCustomerId())
                            .setReturnUrl(appBaseUrl)
                            .build();
            com.stripe.model.billingportal.Session session =
                    com.stripe.model.billingportal.Session.create(params);
            return ResponseEntity.ok(Map.of("url", session.getUrl()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create portal session"));
        }
    }
}
